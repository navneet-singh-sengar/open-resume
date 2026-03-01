from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TailoredExperience(BaseModel):
    company: str
    title: str
    start_date: str
    end_date: Optional[str] = None
    is_current: bool = False
    bullets: list[str] = []


class TailoredEducation(BaseModel):
    institution: str
    degree: str
    field: str
    end_date: Optional[str] = None
    gpa: Optional[float] = None
    highlights: list[str] = []


class TailoredProject(BaseModel):
    name: str
    description: str
    technologies: list[str] = []
    highlights: list[str] = []


class TailoredResume(BaseModel):
    professional_summary: str
    experiences: list[TailoredExperience] = []
    education: list[TailoredEducation] = []
    skills: list[str] = []
    projects: list[TailoredProject] = []
    certifications: list[str] = []


class ResumeUpdateRequest(BaseModel):
    tailored_resume: TailoredResume


class ResumeGenerateRequest(BaseModel):
    job_text: Optional[str] = None
    job_url: Optional[str] = None
    model: Optional[str] = None


class ResumeGenerateResponse(BaseModel):
    id: int
    job_title: str
    company: Optional[str] = None
    tailored_resume: TailoredResume
    ai_model_used: str
    created_at: datetime


class ResumeHistoryItem(BaseModel):
    id: int
    job_title: str
    company: Optional[str] = None
    ai_model_used: str
    created_at: datetime

    model_config = {"from_attributes": True}
