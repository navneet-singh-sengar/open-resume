from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import profile, job, resume, settings

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Open Resume - AI Resume Generator",
    description="Generate ATS-optimized resumes tailored to specific job descriptions",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(job.router, prefix="/api/job", tags=["Job"])
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
