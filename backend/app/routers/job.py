from fastapi import APIRouter, HTTPException

from app.schemas.job import JobDescriptionInput, JobAnalysis
from app.services.scraper import scrape_job_url
from app.services.job_analyzer import analyze_job_description

router = APIRouter()


@router.post("/analyze", response_model=JobAnalysis)
async def analyze_job(data: JobDescriptionInput):
    if not data.text and not data.url:
        raise HTTPException(status_code=400, detail="Provide either job description text or a URL")

    raw_text = data.text or ""

    if data.url:
        scraped = await scrape_job_url(data.url)
        if not scraped:
            raise HTTPException(status_code=422, detail="Could not extract job description from the provided URL")
        raw_text = scraped

    analysis = await analyze_job_description(raw_text)
    return analysis
