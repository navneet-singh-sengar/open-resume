from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import logging

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.resume import GeneratedResume
from app.models.profile import (
    PersonalInfo, WorkExperience, Education,
    Skill, Project, Certification, Publication,
)
from app.schemas.resume import (
    ResumeGenerateRequest, ResumeGenerateResponse,
    ResumeHistoryItem, TailoredResume,
)
from app.schemas.job import JobAnalysis
from app.services.scraper import scrape_job_url
from app.services.job_analyzer import analyze_job_description
from app.services.embeddings import compute_relevance_scores
from app.services.profile_ranker import filter_and_rank_profile
from app.services.resume_builder import build_tailored_resume
from app.services.pdf_generator import generate_pdf
from app.config import get_settings

router = APIRouter()


def _gather_profile(db: Session) -> dict:
    personal = db.query(PersonalInfo).first()
    if not personal:
        raise HTTPException(status_code=400, detail="Please add your personal info first")

    return {
        "personal_info": {
            "name": personal.name,
            "email": personal.email,
            "phone": personal.phone,
            "location": personal.location,
            "linkedin": personal.linkedin,
            "github": personal.github,
            "portfolio": personal.portfolio,
            "summary": personal.summary,
        },
        "work_experience": [
            {
                "company": e.company,
                "title": e.title,
                "start_date": str(e.start_date),
                "end_date": str(e.end_date) if e.end_date else None,
                "is_current": e.is_current,
                "description": e.description,
                "achievements": e.achievements or [],
            }
            for e in db.query(WorkExperience).all()
        ],
        "education": [
            {
                "institution": ed.institution,
                "degree": ed.degree,
                "field": ed.field,
                "start_date": str(ed.start_date),
                "end_date": str(ed.end_date) if ed.end_date else None,
                "gpa": ed.gpa,
                "achievements": ed.achievements or [],
            }
            for ed in db.query(Education).all()
        ],
        "skills": [
            {"name": s.name, "category": s.category, "proficiency_level": s.proficiency_level}
            for s in db.query(Skill).all()
        ],
        "projects": [
            {
                "name": p.name,
                "description": p.description,
                "technologies": p.technologies or [],
                "url": p.url,
                "highlights": p.highlights or [],
            }
            for p in db.query(Project).all()
        ],
        "certifications": [
            {"name": c.name, "issuer": c.issuer, "date": str(c.date) if c.date else None, "url": c.url}
            for c in db.query(Certification).all()
        ],
        "publications": [
            {"title": p.title, "publisher": p.publisher, "date": str(p.date) if p.date else None, "url": p.url}
            for p in db.query(Publication).all()
        ],
    }


@router.post("/generate", response_model=ResumeGenerateResponse)
async def generate_resume(req: ResumeGenerateRequest, db: Session = Depends(get_db)):
    if not req.job_text and not req.job_url:
        raise HTTPException(status_code=400, detail="Provide either job description text or a URL")

    raw_text = req.job_text or ""
    if req.job_url:
        scraped = await scrape_job_url(req.job_url)
        if not scraped:
            raise HTTPException(status_code=422, detail="Could not extract job description from the provided URL")
        raw_text = scraped

    profile = _gather_profile(db)
    model = req.model or get_settings().default_model

    try:
        job_analysis: JobAnalysis = await analyze_job_description(raw_text, model)
    except Exception as e:
        logger.exception("Job analysis failed")
        raise HTTPException(status_code=502, detail=f"AI job analysis failed: {e}")

    try:
        scores = await compute_relevance_scores(job_analysis, raw_text, profile)
        ranked_profile = filter_and_rank_profile(profile, scores)
    except Exception as e:
        logger.exception("Embedding scoring failed — using unranked profile")
        ranked_profile = profile

    try:
        tailored: TailoredResume = await build_tailored_resume(ranked_profile, job_analysis, model, raw_text)
    except Exception as e:
        logger.exception("Resume generation failed")
        raise HTTPException(status_code=502, detail=f"AI resume generation failed: {e}")

    try:
        pdf_path = generate_pdf(profile["personal_info"], tailored)
    except Exception as e:
        logger.exception("PDF generation failed")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    record = GeneratedResume(
        job_title=job_analysis.job_title,
        company=job_analysis.company,
        job_description=raw_text,
        generated_content=tailored.model_dump(),
        pdf_path=pdf_path,
        ai_model_used=model,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return ResumeGenerateResponse(
        id=record.id,
        job_title=record.job_title,
        company=record.company,
        tailored_resume=tailored,
        ai_model_used=model,
        created_at=record.created_at,
    )


@router.get("/history", response_model=list[ResumeHistoryItem])
def list_history(db: Session = Depends(get_db)):
    return db.query(GeneratedResume).order_by(GeneratedResume.created_at.desc()).all()


@router.get("/{resume_id}/download")
def download_resume(resume_id: int, db: Session = Depends(get_db)):
    record = db.query(GeneratedResume).filter(GeneratedResume.id == resume_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found")
    if not record.pdf_path or not os.path.exists(record.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    filename = f"resume_{record.job_title.replace(' ', '_')}_{record.id}.pdf"
    return FileResponse(record.pdf_path, media_type="application/pdf", filename=filename)


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    record = db.query(GeneratedResume).filter(GeneratedResume.id == resume_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found")
    if record.pdf_path and os.path.exists(record.pdf_path):
        os.remove(record.pdf_path)
    db.delete(record)
    db.commit()
    return {"detail": "Resume deleted"}


@router.get("/{resume_id}", response_model=ResumeGenerateResponse)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    record = db.query(GeneratedResume).filter(GeneratedResume.id == resume_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found")
    return ResumeGenerateResponse(
        id=record.id,
        job_title=record.job_title,
        company=record.company,
        tailored_resume=TailoredResume(**record.generated_content),
        ai_model_used=record.ai_model_used,
        created_at=record.created_at,
    )
