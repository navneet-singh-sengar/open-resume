from pydantic import BaseModel
from typing import Optional


class JobDescriptionInput(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None


class JobAnalysis(BaseModel):
    job_title: str
    company: Optional[str] = None
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    experience_level: Optional[str] = None
    years_of_experience: Optional[str] = None
    key_responsibilities: list[str] = []
    keywords: list[str] = []
    education_requirements: Optional[str] = None
    nice_to_haves: list[str] = []
    raw_text: str = ""
