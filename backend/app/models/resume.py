from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from datetime import datetime, timezone

from app.database import Base


class GeneratedResume(Base):
    __tablename__ = "generated_resumes"

    id = Column(Integer, primary_key=True, index=True)
    job_title = Column(String(300), nullable=False)
    company = Column(String(300))
    job_description = Column(Text, nullable=False)
    generated_content = Column(JSON, nullable=False)
    pdf_path = Column(String(500))
    ai_model_used = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
