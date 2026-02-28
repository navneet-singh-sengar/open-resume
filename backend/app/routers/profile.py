import logging
from datetime import date
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.profile import (
    PersonalInfo, WorkExperience, Education,
    Skill, Project, Certification, Publication,
)
from app.schemas.profile import (
    PersonalInfoCreate, PersonalInfoUpdate, PersonalInfoResponse,
    WorkExperienceCreate, WorkExperienceUpdate, WorkExperienceResponse,
    EducationCreate, EducationUpdate, EducationResponse,
    SkillCreate, SkillUpdate, SkillResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    CertificationCreate, CertificationUpdate, CertificationResponse,
    PublicationCreate, PublicationUpdate, PublicationResponse,
    FullProfileResponse,
)
from app.services.resume_parser import parse_resume_text
from app.services.file_extractor import extract_text_from_file

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Generic CRUD helpers ───

def _get_or_404(db: Session, model, item_id: int):
    obj = db.query(model).filter(model.id == item_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__tablename__} #{item_id} not found")
    return obj


def _create(db: Session, model, schema):
    obj = model(**schema.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def _update(db: Session, model, item_id: int, schema):
    obj = _get_or_404(db, model, item_id)
    for key, value in schema.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def _delete(db: Session, model, item_id: int):
    obj = _get_or_404(db, model, item_id)
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ─── Full Profile ───

@router.get("/", response_model=FullProfileResponse)
def get_full_profile(db: Session = Depends(get_db)):
    return FullProfileResponse(
        personal_info=db.query(PersonalInfo).first(),
        work_experience=db.query(WorkExperience).all(),
        education=db.query(Education).all(),
        skills=db.query(Skill).all(),
        projects=db.query(Project).all(),
        certifications=db.query(Certification).all(),
        publications=db.query(Publication).all(),
    )


# ─── Import Resume ───

def _parse_date(value) -> date | None:
    """Convert a date string from AI output to a Python date object."""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value or value.lower() in ("null", "none", "present", "current", "ongoing"):
            return None
        for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
            try:
                from datetime import datetime
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        logger.warning("Could not parse date: %s", value)
    return None


class ResumeImportRequest(BaseModel):
    resume_text: str
    model: Optional[str] = None


class ResumeImportResponse(BaseModel):
    profile: FullProfileResponse
    counts: dict
    skipped: dict


def _import_parsed_profile(db: Session, parsed: dict) -> tuple[dict, dict]:
    """Insert parsed profile data with deduplication. Returns (counts, skipped)."""
    counts = {
        "personal_info": 0,
        "work_experience": 0,
        "education": 0,
        "skills": 0,
        "projects": 0,
        "certifications": 0,
    }
    skipped = {
        "work_experience": 0,
        "education": 0,
        "skills": 0,
        "projects": 0,
        "certifications": 0,
    }

    pi = parsed.get("personal_info", {})
    if pi and pi.get("name"):
        existing = db.query(PersonalInfo).first()
        if existing:
            for key, value in pi.items():
                if value is not None:
                    setattr(existing, key, value)
        else:
            db.add(PersonalInfo(**{
                k: v for k, v in pi.items()
                if k in ("name", "email", "phone", "location", "linkedin", "github", "portfolio", "summary") and v is not None
            }))
        counts["personal_info"] = 1

    for exp in parsed.get("work_experience", []):
        try:
            company = exp.get("company", "")
            title = exp.get("title", "")
            start = _parse_date(exp.get("start_date"))
            if not start:
                start = date(2020, 1, 1)
            dup = db.query(WorkExperience).filter(
                WorkExperience.company == company,
                WorkExperience.title == title,
                WorkExperience.start_date == start,
            ).first()
            if dup:
                skipped["work_experience"] += 1
                continue
            db.add(WorkExperience(
                company=company,
                title=title,
                start_date=start,
                end_date=_parse_date(exp.get("end_date")),
                is_current=exp.get("is_current", False),
                description=exp.get("description"),
                achievements=exp.get("achievements", []),
            ))
            counts["work_experience"] += 1
        except Exception:
            logger.warning("Skipping malformed experience entry: %s", exp, exc_info=True)

    for edu in parsed.get("education", []):
        try:
            institution = edu.get("institution", "")
            degree = edu.get("degree", "")
            field = edu.get("field", "")
            dup = db.query(Education).filter(
                Education.institution == institution,
                Education.degree == degree,
                Education.field == field,
            ).first()
            if dup:
                skipped["education"] += 1
                continue
            start = _parse_date(edu.get("start_date"))
            if not start:
                start = date(2017, 1, 1)
            db.add(Education(
                institution=institution,
                degree=degree,
                field=field,
                start_date=start,
                end_date=_parse_date(edu.get("end_date")),
                gpa=edu.get("gpa"),
                achievements=edu.get("achievements", []),
            ))
            counts["education"] += 1
        except Exception:
            logger.warning("Skipping malformed education entry: %s", edu, exc_info=True)

    for skill in parsed.get("skills", []):
        try:
            name = skill.get("name", "") if isinstance(skill, dict) else str(skill)
            if not name:
                continue
            if db.query(Skill).filter(Skill.name == name).first():
                skipped["skills"] += 1
                continue
            db.add(Skill(
                name=name,
                category=skill.get("category", "technical") if isinstance(skill, dict) else "technical",
                proficiency_level=skill.get("proficiency_level", 3) if isinstance(skill, dict) else 3,
            ))
            counts["skills"] += 1
        except Exception:
            logger.warning("Skipping malformed skill entry: %s", skill)

    for proj in parsed.get("projects", []):
        try:
            name = proj.get("name", "")
            if db.query(Project).filter(Project.name == name).first():
                skipped["projects"] += 1
                continue
            db.add(Project(
                name=name,
                description=proj.get("description"),
                technologies=proj.get("technologies", []),
                url=proj.get("url"),
                highlights=proj.get("highlights", []),
            ))
            counts["projects"] += 1
        except Exception:
            logger.warning("Skipping malformed project entry: %s", proj)

    for cert in parsed.get("certifications", []):
        try:
            name = cert.get("name", "")
            issuer = cert.get("issuer", "")
            if db.query(Certification).filter(
                Certification.name == name,
                Certification.issuer == issuer,
            ).first():
                skipped["certifications"] += 1
                continue
            db.add(Certification(
                name=name,
                issuer=issuer,
                date=_parse_date(cert.get("date")),
                url=cert.get("url"),
            ))
            counts["certifications"] += 1
        except Exception:
            logger.warning("Skipping malformed certification entry: %s", cert)

    db.commit()
    return counts, skipped


def _build_full_profile(db: Session) -> FullProfileResponse:
    return FullProfileResponse(
        personal_info=db.query(PersonalInfo).first(),
        work_experience=db.query(WorkExperience).all(),
        education=db.query(Education).all(),
        skills=db.query(Skill).all(),
        projects=db.query(Project).all(),
        certifications=db.query(Certification).all(),
        publications=db.query(Publication).all(),
    )


@router.post("/import-resume", response_model=ResumeImportResponse)
async def import_resume(data: ResumeImportRequest, db: Session = Depends(get_db)):
    if not data.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")

    try:
        parsed = await parse_resume_text(data.resume_text, data.model)
    except Exception as e:
        logger.exception("Resume parsing failed")
        raise HTTPException(status_code=502, detail=f"AI resume parsing failed: {e}")

    counts, skipped = _import_parsed_profile(db, parsed)
    return ResumeImportResponse(profile=_build_full_profile(db), counts=counts, skipped=skipped)


@router.post("/import-resume-file", response_model=ResumeImportResponse)
async def import_resume_file(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    text = await extract_text_from_file(file)

    try:
        parsed = await parse_resume_text(text, model)
    except Exception as e:
        logger.exception("Resume parsing failed")
        raise HTTPException(status_code=502, detail=f"AI resume parsing failed: {e}")

    counts, skipped = _import_parsed_profile(db, parsed)
    return ResumeImportResponse(profile=_build_full_profile(db), counts=counts, skipped=skipped)


# ─── Personal Info (singleton) ───

@router.get("/personal", response_model=PersonalInfoResponse | None)
def get_personal_info(db: Session = Depends(get_db)):
    return db.query(PersonalInfo).first()


@router.post("/personal", response_model=PersonalInfoResponse)
def upsert_personal_info(data: PersonalInfoCreate, db: Session = Depends(get_db)):
    existing = db.query(PersonalInfo).first()
    if existing:
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing
    return _create(db, PersonalInfo, data)


@router.patch("/personal", response_model=PersonalInfoResponse)
def patch_personal_info(data: PersonalInfoUpdate, db: Session = Depends(get_db)):
    existing = db.query(PersonalInfo).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Personal info not found. Create it first.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(existing, key, value)
    db.commit()
    db.refresh(existing)
    return existing


# ─── Work Experience ───

@router.get("/experience", response_model=list[WorkExperienceResponse])
def list_experience(db: Session = Depends(get_db)):
    return db.query(WorkExperience).all()


@router.post("/experience", response_model=WorkExperienceResponse)
def create_experience(data: WorkExperienceCreate, db: Session = Depends(get_db)):
    return _create(db, WorkExperience, data)


@router.put("/experience/{item_id}", response_model=WorkExperienceResponse)
def update_experience(item_id: int, data: WorkExperienceUpdate, db: Session = Depends(get_db)):
    return _update(db, WorkExperience, item_id, data)


@router.delete("/experience/{item_id}")
def delete_experience(item_id: int, db: Session = Depends(get_db)):
    return _delete(db, WorkExperience, item_id)


# ─── Education ───

@router.get("/education", response_model=list[EducationResponse])
def list_education(db: Session = Depends(get_db)):
    return db.query(Education).all()


@router.post("/education", response_model=EducationResponse)
def create_education(data: EducationCreate, db: Session = Depends(get_db)):
    return _create(db, Education, data)


@router.put("/education/{item_id}", response_model=EducationResponse)
def update_education(item_id: int, data: EducationUpdate, db: Session = Depends(get_db)):
    return _update(db, Education, item_id, data)


@router.delete("/education/{item_id}")
def delete_education(item_id: int, db: Session = Depends(get_db)):
    return _delete(db, Education, item_id)


# ─── Skills ───

@router.get("/skills", response_model=list[SkillResponse])
def list_skills(db: Session = Depends(get_db)):
    return db.query(Skill).all()


@router.post("/skills", response_model=SkillResponse)
def create_skill(data: SkillCreate, db: Session = Depends(get_db)):
    return _create(db, Skill, data)


@router.put("/skills/{item_id}", response_model=SkillResponse)
def update_skill(item_id: int, data: SkillUpdate, db: Session = Depends(get_db)):
    return _update(db, Skill, item_id, data)


@router.delete("/skills/{item_id}")
def delete_skill(item_id: int, db: Session = Depends(get_db)):
    return _delete(db, Skill, item_id)


# ─── Projects ───

@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()


@router.post("/projects", response_model=ProjectResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    return _create(db, Project, data)


@router.put("/projects/{item_id}", response_model=ProjectResponse)
def update_project(item_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    return _update(db, Project, item_id, data)


@router.delete("/projects/{item_id}")
def delete_project(item_id: int, db: Session = Depends(get_db)):
    return _delete(db, Project, item_id)


# ─── Certifications ───

@router.get("/certifications", response_model=list[CertificationResponse])
def list_certifications(db: Session = Depends(get_db)):
    return db.query(Certification).all()


@router.post("/certifications", response_model=CertificationResponse)
def create_certification(data: CertificationCreate, db: Session = Depends(get_db)):
    return _create(db, Certification, data)


@router.put("/certifications/{item_id}", response_model=CertificationResponse)
def update_certification(item_id: int, data: CertificationUpdate, db: Session = Depends(get_db)):
    return _update(db, Certification, item_id, data)


@router.delete("/certifications/{item_id}")
def delete_certification(item_id: int, db: Session = Depends(get_db)):
    return _delete(db, Certification, item_id)


# ─── Publications ───

@router.get("/publications", response_model=list[PublicationResponse])
def list_publications(db: Session = Depends(get_db)):
    return db.query(Publication).all()


@router.post("/publications", response_model=PublicationResponse)
def create_publication(data: PublicationCreate, db: Session = Depends(get_db)):
    return _create(db, Publication, data)


@router.put("/publications/{item_id}", response_model=PublicationResponse)
def update_publication(item_id: int, data: PublicationUpdate, db: Session = Depends(get_db)):
    return _update(db, Publication, item_id, data)


@router.delete("/publications/{item_id}")
def delete_publication(item_id: int, db: Session = Depends(get_db)):
    return _delete(db, Publication, item_id)
