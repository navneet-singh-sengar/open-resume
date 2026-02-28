import logging
from app.services.ai_engine import call_llm_json

logger = logging.getLogger(__name__)

RESUME_PARSE_SYSTEM_PROMPT = """You are an expert resume parser. Your task is to extract structured data from a raw resume text.

Return a JSON object with EXACTLY this structure. Use null for missing fields, [] for empty lists.

{
  "personal_info": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1234567890 or null",
    "location": "City, State/Country or null",
    "linkedin": "LinkedIn URL or null",
    "github": "GitHub URL or null",
    "portfolio": "Portfolio URL or null",
    "summary": "Professional summary paragraph or null"
  },
  "work_experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null",
      "is_current": false,
      "description": "Brief role description or null",
      "achievements": ["Achievement bullet 1", "Achievement bullet 2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Type (e.g., B.Tech., M.S., MBA)",
      "field": "Field of Study",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD or null",
      "gpa": null,
      "achievements": []
    }
  ],
  "skills": [
    {
      "name": "Skill Name",
      "category": "technical",
      "proficiency_level": 3
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["Tech1", "Tech2"],
      "url": null,
      "highlights": ["Key achievement or feature"]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "YYYY-MM-DD or null",
      "url": null
    }
  ]
}

RULES:
- Extract ALL information present in the resume. Do not skip anything.
- For dates: use YYYY-MM-DD format. If only month/year is given, use the 1st of that month (e.g., "Feb 2024" -> "2024-02-01"). If only a year, use "YYYY-01-01".
- For is_current: set to true if the role says "Present", "Current", "Ongoing", or has no end date and appears to be the latest role.
- For skills category: use one of "technical", "tool", "language", "soft", "other". Programming languages go under "language". Frameworks, libraries, databases go under "technical". Tools like Git, JIRA, Postman go under "tool".
- For proficiency_level: estimate 1-5 based on context. Primary/expert skills = 5, frequently mentioned = 4, mentioned once = 3, basic/familiar = 2.
- For achievements: extract bullet points from each role. If the resume uses paragraphs instead of bullets, split into individual achievement statements.
- For projects: extract project entries if they exist as a separate section. Include technologies used and key highlights.
- If a section is not present in the resume, return an empty list [] for that section.
- Return ONLY valid JSON. No markdown, no comments, no explanation."""


async def parse_resume_text(text: str, model: str | None = None) -> dict:
    """Parse raw resume text into structured profile data using AI."""
    result = await call_llm_json(
        system_prompt=RESUME_PARSE_SYSTEM_PROMPT,
        user_prompt=f"Parse this resume and extract all structured data:\n\n{text}",
        model=model,
    )

    if "personal_info" not in result:
        result["personal_info"] = {}
    for key in ("work_experience", "education", "skills", "projects", "certifications"):
        if key not in result:
            result[key] = []

    for exp in result.get("work_experience", []):
        if "achievements" not in exp:
            exp["achievements"] = []
        if "is_current" not in exp:
            exp["is_current"] = False

    for edu in result.get("education", []):
        if "achievements" not in edu:
            edu["achievements"] = []

    for skill in result.get("skills", []):
        if isinstance(skill, str):
            skill = {"name": skill, "category": "technical", "proficiency_level": 3}
        if "category" not in skill:
            skill["category"] = "technical"
        if "proficiency_level" not in skill:
            skill["proficiency_level"] = 3

    result["skills"] = [
        s if isinstance(s, dict) else {"name": s, "category": "technical", "proficiency_level": 3}
        for s in result.get("skills", [])
    ]

    for proj in result.get("projects", []):
        if "technologies" not in proj:
            proj["technologies"] = []
        if "highlights" not in proj:
            proj["highlights"] = []

    return result
