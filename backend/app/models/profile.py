from sqlalchemy import Column, Integer, String, Text, Float, Boolean, Date, JSON
from app.database import Base


class PersonalInfo(Base):
    __tablename__ = "personal_info"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    phone = Column(String(50))
    location = Column(String(200))
    linkedin = Column(String(500))
    github = Column(String(500))
    portfolio = Column(String(500))
    summary = Column(Text)


class WorkExperience(Base):
    __tablename__ = "work_experience"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(300), nullable=False)
    title = Column(String(300), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=False)
    description = Column(Text)
    achievements = Column(JSON, default=list)


class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)
    institution = Column(String(300), nullable=False)
    degree = Column(String(200), nullable=False)
    field = Column(String(200), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    gpa = Column(Float, nullable=True)
    achievements = Column(JSON, default=list)


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    proficiency_level = Column(Integer, default=3)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    description = Column(Text)
    technologies = Column(JSON, default=list)
    url = Column(String(500))
    highlights = Column(JSON, default=list)


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    issuer = Column(String(300), nullable=False)
    date = Column(Date, nullable=True)
    url = Column(String(500))


class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    publisher = Column(String(300))
    date = Column(Date, nullable=True)
    url = Column(String(500))
