from app.services.ai_engine import call_llm_json
from app.schemas.job import JobAnalysis

ANALYSIS_SYSTEM_PROMPT = """You are an expert job description analyst. Your task is to parse a job description and extract structured information.

Return a JSON object with EXACTLY these fields:
{
  "job_title": "the job title",
  "company": "company name or null",
  "required_skills": ["list of explicitly required skills"],
  "preferred_skills": ["list of preferred/nice-to-have skills"],
  "experience_level": "entry/mid/senior/lead/principal or null",
  "years_of_experience": "e.g. '3-5 years' or null",
  "key_responsibilities": ["list of main responsibilities"],
  "keywords": ["important ATS keywords found in the description"],
  "education_requirements": "degree requirements or null",
  "nice_to_haves": ["additional nice-to-have qualifications"]
}

Be thorough in extracting keywords — include technologies, methodologies, tools, soft skills, and domain-specific terms that an ATS system would scan for."""


async def analyze_job_description(raw_text: str, model: str | None = None) -> JobAnalysis:
    result = await call_llm_json(
        system_prompt=ANALYSIS_SYSTEM_PROMPT,
        user_prompt=f"Analyze this job description:\n\n{raw_text}",
        model=model,
    )

    return JobAnalysis(
        job_title=result.get("job_title", "Unknown Position"),
        company=result.get("company"),
        required_skills=result.get("required_skills", []),
        preferred_skills=result.get("preferred_skills", []),
        experience_level=result.get("experience_level"),
        years_of_experience=result.get("years_of_experience"),
        key_responsibilities=result.get("key_responsibilities", []),
        keywords=result.get("keywords", []),
        education_requirements=result.get("education_requirements"),
        nice_to_haves=result.get("nice_to_haves", []),
        raw_text=raw_text,
    )
