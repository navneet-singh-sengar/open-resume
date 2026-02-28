from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional


# --- Personal Info ---

class PersonalInfoBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None


class PersonalInfoCreate(PersonalInfoBase):
    pass


class PersonalInfoUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None


class PersonalInfoResponse(PersonalInfoBase):
    id: int

    model_config = {"from_attributes": True}


# --- Work Experience ---

class WorkExperienceBase(BaseModel):
    company: str
    title: str
    start_date: date
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None
    achievements: list[str] = []


class WorkExperienceCreate(WorkExperienceBase):
    pass


class WorkExperienceUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    achievements: Optional[list[str]] = None


class WorkExperienceResponse(WorkExperienceBase):
    id: int

    model_config = {"from_attributes": True}


# --- Education ---

class EducationBase(BaseModel):
    institution: str
    degree: str
    field: str
    start_date: date
    end_date: Optional[date] = None
    gpa: Optional[float] = None
    achievements: list[str] = []


class EducationCreate(EducationBase):
    pass


class EducationUpdate(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    gpa: Optional[float] = None
    achievements: Optional[list[str]] = None


class EducationResponse(EducationBase):
    id: int

    model_config = {"from_attributes": True}


# --- Skill ---

class SkillBase(BaseModel):
    name: str
    category: str
    proficiency_level: int = 3


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    proficiency_level: Optional[int] = None


class SkillResponse(SkillBase):
    id: int

    model_config = {"from_attributes": True}


# --- Project ---

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    technologies: list[str] = []
    url: Optional[str] = None
    highlights: list[str] = []


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    technologies: Optional[list[str]] = None
    url: Optional[str] = None
    highlights: Optional[list[str]] = None


class ProjectResponse(ProjectBase):
    id: int

    model_config = {"from_attributes": True}


# --- Certification ---

class CertificationBase(BaseModel):
    name: str
    issuer: str
    date: Optional[date] = None
    url: Optional[str] = None


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    date: Optional[date] = None
    url: Optional[str] = None


class CertificationResponse(CertificationBase):
    id: int

    model_config = {"from_attributes": True}


# --- Publication ---

class PublicationBase(BaseModel):
    title: str
    publisher: Optional[str] = None
    date: Optional[date] = None
    url: Optional[str] = None


class PublicationCreate(PublicationBase):
    pass


class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    publisher: Optional[str] = None
    date: Optional[date] = None
    url: Optional[str] = None


class PublicationResponse(PublicationBase):
    id: int

    model_config = {"from_attributes": True}


# --- Full Profile ---

class FullProfileResponse(BaseModel):
    personal_info: Optional[PersonalInfoResponse] = None
    work_experience: list[WorkExperienceResponse] = []
    education: list[EducationResponse] = []
    skills: list[SkillResponse] = []
    projects: list[ProjectResponse] = []
    certifications: list[CertificationResponse] = []
    publications: list[PublicationResponse] = []
