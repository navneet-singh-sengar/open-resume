import math
import logging
from typing import Optional

import httpx

from app.config import get_settings
from app.schemas.job import JobAnalysis

logger = logging.getLogger(__name__)

_ollama_available: Optional[bool] = None


async def _check_ollama() -> bool:
    """Probe Ollama once and cache the result."""
    global _ollama_available
    if _ollama_available is not None:
        return _ollama_available

    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            _ollama_available = resp.status_code == 200
    except Exception:
        _ollama_available = False

    if not _ollama_available:
        logger.warning("Ollama not available at %s — semantic matching disabled", settings.ollama_base_url)
    return _ollama_available


async def get_embedding(text: str) -> list[float]:
    """Get an embedding vector from the local Ollama instance."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.embedding_model, "prompt": text},
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _build_jd_document(job_analysis: JobAnalysis, raw_jd: str) -> str:
    """Combine JD fields into a single embedding-friendly document."""
    parts = [
        f"Role: {job_analysis.job_title}",
        f"Required Skills: {', '.join(job_analysis.required_skills)}",
        f"Responsibilities: {', '.join(job_analysis.key_responsibilities)}",
        f"Keywords: {', '.join(job_analysis.keywords)}",
    ]
    if job_analysis.preferred_skills:
        parts.append(f"Preferred Skills: {', '.join(job_analysis.preferred_skills)}")
    if raw_jd:
        parts.append(f"Full Description: {raw_jd[:2000]}")
    return "\n".join(parts)


def _experience_text(exp: dict) -> str:
    achievements = exp.get("achievements") or []
    ach_str = ". ".join(achievements) if achievements else ""
    desc = exp.get("description", "")
    return f"{exp.get('title', '')} at {exp.get('company', '')}: {desc}. Achievements: {ach_str}"


def _project_text(proj: dict) -> str:
    techs = ", ".join(proj.get("technologies") or [])
    highlights = ". ".join(proj.get("highlights") or [])
    return f"{proj.get('name', '')}: {proj.get('description', '')}. Tech: {techs}. {highlights}"


def _skill_cluster_text(category: str, skills: list[str]) -> str:
    return f"{category}: {', '.join(skills)}"


def _certification_text(cert: dict) -> str:
    return f"{cert.get('name', '')} from {cert.get('issuer', '')}"


async def compute_relevance_scores(
    job_analysis: JobAnalysis,
    raw_jd: str,
    profile: dict,
) -> dict:
    """Embed the JD and every profile item, return cosine similarity scores.

    Returns a dict with keys: experiences, projects, skill_clusters, certifications.
    Each value is a list of (index, score) tuples sorted descending by score.
    Returns None if Ollama is unavailable.
    """
    if not await _check_ollama():
        return None

    try:
        jd_doc = _build_jd_document(job_analysis, raw_jd)
        jd_embedding = await get_embedding(jd_doc)

        scores: dict = {"experiences": [], "projects": [], "skill_clusters": [], "certifications": []}

        for i, exp in enumerate(profile.get("work_experience", [])):
            emb = await get_embedding(_experience_text(exp))
            scores["experiences"].append((i, _cosine_similarity(jd_embedding, emb)))

        for i, proj in enumerate(profile.get("projects", [])):
            emb = await get_embedding(_project_text(proj))
            scores["projects"].append((i, _cosine_similarity(jd_embedding, emb)))

        skill_groups: dict[str, list[str]] = {}
        for s in profile.get("skills", []):
            cat = s.get("category", "General")
            skill_groups.setdefault(cat, []).append(s.get("name", ""))

        for cat, names in skill_groups.items():
            emb = await get_embedding(_skill_cluster_text(cat, names))
            scores["skill_clusters"].append((cat, _cosine_similarity(jd_embedding, emb)))

        for i, cert in enumerate(profile.get("certifications", [])):
            emb = await get_embedding(_certification_text(cert))
            scores["certifications"].append((i, _cosine_similarity(jd_embedding, emb)))

        for key in scores:
            scores[key].sort(key=lambda x: x[1], reverse=True)

        logger.info(
            "Embedding scores — experiences: %s, projects: %s, skills: %s, certs: %s",
            [(i, round(s, 3)) for i, s in scores["experiences"]],
            [(i, round(s, 3)) for i, s in scores["projects"]],
            [(c, round(s, 3)) for c, s in scores["skill_clusters"]],
            [(i, round(s, 3)) for i, s in scores["certifications"]],
        )

        return scores

    except Exception:
        logger.exception("Embedding scoring failed — falling back to unranked profile")
        return None
