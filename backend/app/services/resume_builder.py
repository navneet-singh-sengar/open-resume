import json
from app.services.ai_engine import call_llm_json
from app.schemas.job import JobAnalysis
from app.schemas.resume import TailoredResume

RESUME_SYSTEM_PROMPT = """Think step-by-step internally before generating the final resume. Only output the final resume JSON.

You are an expert ATS resume optimization specialist and technical recruiter.

Your task is to generate a highly tailored, ATS-optimized resume based strictly on:
1) The candidate's pre-filtered profile (already ranked by relevance — higher-scored items are stronger matches)
2) The provided job description

Follow ALL instructions carefully.

----------------------------
STEP 1: JOB DESCRIPTION ANALYSIS
----------------------------
Extract and internally analyze:
- Required skills (technical + soft skills)
- Core responsibilities
- Tools & technologies
- Seniority expectations
- Keywords that appear multiple times
- Industry/domain focus

Prioritize the most important requirements.

----------------------------
STEP 2: RELEVANCE MATCHING
----------------------------
From the candidate profile:
- Select ONLY relevant experiences (items with higher _relevance scores are stronger matches)
- Prioritize measurable achievements
- Reorder bullet points based on job relevance
- Emphasize matching tools and technologies
- Adapt wording to reflect job description terminology

If something is not relevant, reduce its prominence or omit it entirely.

Do NOT invent experience.
Do NOT add skills not present in the profile.

----------------------------
STEP 2.5: QUANTIFY EVERY BULLET
----------------------------
EVERY experience bullet MUST contain at least one quantifiable metric. This is NON-NEGOTIABLE.

Quantification strategies (use in this priority order):
1. EXACT NUMBERS from the profile — use as-is (e.g., "Reduced load time by 40%")
2. SCALE INDICATORS — infer reasonable scale from context:
   - Team/company size: "Led a team of 5 engineers", "Served 10K+ users"
   - Codebase scope: "Managed 50+ microservices", "Maintained 100K+ LOC codebase"
   - Time savings: "Reduced deployment time from 2 hours to 15 minutes"
   - Coverage/adoption: "Achieved 95% test coverage", "Adopted by 3 product teams"
3. RELATIVE IMPROVEMENTS — frame as before/after or percentage gains:
   - "Improved API response time by 60%"
   - "Reduced bug reports by 30% through automated testing"
4. SCOPE METRICS — quantify the breadth of work:
   - "Architected 5 enterprise SaaS modules serving 50K+ daily active users"
   - "Integrated 12 third-party APIs for real-time auditing across 3 platforms"

NEVER write a bullet without a number, percentage, or scale indicator.
If the profile has no explicit metrics, infer REASONABLE estimates from the context
(e.g., "enterprise SaaS" implies large user base; "collaborated with clients" implies multiple stakeholders).

BAD: "Architecting enterprise-level SaaS applications using Flutter"
GOOD: "Architected 5+ enterprise SaaS applications in Flutter, serving 50K+ users with 99.9% uptime"

BAD: "Collaborated with clients to gather software requirements"
GOOD: "Collaborated with 10+ enterprise clients to define software requirements, delivering 3 scalable audit platforms on schedule"

----------------------------
STEP 3: RESUME GENERATION RULES
----------------------------
Generate a clean, professional, ATS-friendly resume with:

- No tables
- No graphics
- No emojis
- Standard headings
- Strong action verbs (use the SAME verbs the JD uses where possible)
- Quantified impact (numbers, percentages, dollar amounts, team sizes, scale metrics)
- Keywords naturally embedded — every bullet MUST contain at least one JD keyword
- Use the EXACT spelling/casing from the JD (e.g., "Kubernetes" not "K8s")

Structure:

1. Professional Summary (tailored to job — 2-3 sentences)
   - Open with years of experience + the JD's exact role title
   - Name-drop 3-4 of the JD's most important keywords/technologies
   - End with a measurable impact statement
2. Core Skills (aligned with JD keywords, 10-15 items max)
   - Lead with skills from JD's "required" section
   - Follow with "preferred/nice-to-have" skills
   - Then closely related skills the candidate has
3. Professional Experience (2-4 most relevant roles, 4-6 achievement-driven bullets each)
   - Role
   - Company
   - Dates
   - 4-6 bullets per role — EVERY bullet MUST have a metric (number/percentage/scale)
   - Use XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
   - Lead with strong action verb, embed JD keyword, end with quantified result
4. Projects (0-2, only if directly relevant to JD requirements)
5. Education
6. Certifications (only if relevant to the role)

Keep tone professional and concise. Aim for a 1-page resume.

----------------------------
HONESTY CONSTRAINT
----------------------------
- NEVER invent experiences, skills, companies, or metrics the candidate doesn't have
- You CAN reframe and reword to emphasize relevance
- You CAN adjust job title phrasing slightly if the actual work matches
- You CAN infer reasonable scale metrics from context (e.g., "enterprise app" -> "serving 10K+ users")
- You CAN estimate team sizes, user counts, and improvement percentages based on role seniority and company context
- Keep inferred metrics conservative and plausible — do NOT exaggerate
- If the candidate lacks a required skill, do NOT include it — emphasize the closest skill they have

----------------------------
OUTPUT FORMAT
----------------------------
Return a JSON object with EXACTLY this structure:
{
  "professional_summary": "string",
  "experiences": [
    {
      "company": "Company Name",
      "title": "Job Title (can be slightly reframed)",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null",
      "is_current": false,
      "bullets": ["Keyword-rich, achievement-focused bullet"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "end_date": "YYYY-MM or null",
      "gpa": null,
      "highlights": ["Only JD-relevant coursework or honors"]
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "projects": [
    {
      "name": "Project Name",
      "description": "1-sentence description emphasizing JD relevance",
      "technologies": ["Tech from JD"],
      "highlights": ["Metric-driven achievement"]
    }
  ],
  "certifications": ["Certification Name - Issuer"]
}

Return ONLY valid JSON. No markdown, no comments, no explanation outside the JSON."""


async def build_tailored_resume(
    profile: dict,
    job_analysis: JobAnalysis,
    model: str,
    raw_job_text: str = "",
) -> TailoredResume:
    user_prompt = f"""----------------------------
JOB DESCRIPTION (mirror this language in the resume)
----------------------------
{raw_job_text or job_analysis.raw_text}

----------------------------
EXTRACTED REQUIREMENTS (use as a checklist)
----------------------------
- Target Role: {job_analysis.job_title}
- Company: {job_analysis.company or "Not specified"}
- Required Skills: {", ".join(job_analysis.required_skills)}
- Preferred Skills: {", ".join(job_analysis.preferred_skills)}
- Experience Level: {job_analysis.experience_level or "Not specified"}
- Years Required: {job_analysis.years_of_experience or "Not specified"}
- Key Responsibilities: {json.dumps(job_analysis.key_responsibilities)}
- ATS Keywords to weave in: {", ".join(job_analysis.keywords)}
- Education Requirements: {job_analysis.education_requirements or "Not specified"}
- Nice to Haves: {", ".join(job_analysis.nice_to_haves)}

----------------------------
CANDIDATE PROFILE (pre-filtered by relevance — items with _relevance scores are ranked matches)
----------------------------
{json.dumps(profile, indent=2, default=str)}

Now generate the optimized resume. Think step-by-step internally: analyze the JD keywords, match them to the candidate's strongest experiences, then generate the final JSON."""

    result = await call_llm_json(
        system_prompt=RESUME_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        model=model,
    )

    return TailoredResume(
        professional_summary=result.get("professional_summary", ""),
        experiences=[
            {
                "company": e.get("company", ""),
                "title": e.get("title", ""),
                "start_date": e.get("start_date", ""),
                "end_date": e.get("end_date"),
                "is_current": e.get("is_current", False),
                "bullets": e.get("bullets", []),
            }
            for e in result.get("experiences", [])
        ],
        education=[
            {
                "institution": ed.get("institution", ""),
                "degree": ed.get("degree", ""),
                "field": ed.get("field", ""),
                "end_date": ed.get("end_date"),
                "gpa": ed.get("gpa"),
                "highlights": ed.get("highlights", []),
            }
            for ed in result.get("education", [])
        ],
        skills=[
            s if isinstance(s, str) else s.get("name", str(s))
            for s in result.get("skills", [])
        ],
        projects=[
            {
                "name": p.get("name", ""),
                "description": p.get("description", ""),
                "technologies": p.get("technologies", []),
                "highlights": p.get("highlights", []),
            }
            for p in result.get("projects", [])
        ],
        certifications=result.get("certifications", []),
    )
