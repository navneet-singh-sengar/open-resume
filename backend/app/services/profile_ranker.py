import logging
from typing import Optional

logger = logging.getLogger(__name__)

RELEVANCE_THRESHOLD = 0.35
MIN_EXPERIENCES = 2
MAX_EXPERIENCES = 4
MAX_PROJECTS = 2
MAX_SKILLS = 15


def filter_and_rank_profile(profile: dict, scores: Optional[dict]) -> dict:
    """Return a pruned, reordered copy of the profile based on embedding scores.

    If scores is None (Ollama unavailable), returns the original profile unchanged.
    Each kept item gets a `_relevance` metadata field so the generation prompt
    can see how strong the match is.
    """
    if scores is None:
        return profile

    ranked = {
        "personal_info": profile.get("personal_info", {}),
        "education": profile.get("education", []),
        "publications": profile.get("publications", []),
    }

    ranked["work_experience"] = _rank_experiences(
        profile.get("work_experience", []),
        scores.get("experiences", []),
    )

    ranked["projects"] = _rank_projects(
        profile.get("projects", []),
        scores.get("projects", []),
    )

    ranked["skills"] = _rank_skills(
        profile.get("skills", []),
        scores.get("skill_clusters", []),
    )

    ranked["certifications"] = _rank_certifications(
        profile.get("certifications", []),
        scores.get("certifications", []),
    )

    kept_exp = len(ranked["work_experience"])
    total_exp = len(profile.get("work_experience", []))
    kept_proj = len(ranked["projects"])
    total_proj = len(profile.get("projects", []))
    logger.info(
        "Profile ranked — experiences: %d/%d, projects: %d/%d, skills: %d, certs: %d",
        kept_exp, total_exp, kept_proj, total_proj,
        len(ranked["skills"]), len(ranked["certifications"]),
    )

    return ranked


def _rank_experiences(experiences: list[dict], scored: list[tuple]) -> list[dict]:
    if not scored:
        return experiences

    score_map = {idx: score for idx, score in scored}
    relevant = [
        (idx, score) for idx, score in scored
        if score >= RELEVANCE_THRESHOLD and idx < len(experiences)
    ]

    if len(relevant) < MIN_EXPERIENCES:
        relevant = scored[:MIN_EXPERIENCES]

    relevant = relevant[:MAX_EXPERIENCES]

    result = []
    for idx, score in relevant:
        if idx < len(experiences):
            exp = dict(experiences[idx])
            exp["_relevance"] = round(score, 3)
            result.append(exp)

    return result


def _rank_projects(projects: list[dict], scored: list[tuple]) -> list[dict]:
    if not scored:
        return projects

    relevant = [
        (idx, score) for idx, score in scored
        if score >= RELEVANCE_THRESHOLD and idx < len(projects)
    ]
    relevant = relevant[:MAX_PROJECTS]

    result = []
    for idx, score in relevant:
        if idx < len(projects):
            proj = dict(projects[idx])
            proj["_relevance"] = round(score, 3)
            result.append(proj)

    return result


def _rank_skills(skills: list[dict], scored_clusters: list[tuple]) -> list[dict]:
    if not scored_clusters:
        return skills

    cluster_scores = {cat: score for cat, score in scored_clusters}

    decorated = []
    for s in skills:
        cat = s.get("category", "General")
        cat_score = cluster_scores.get(cat, 0.0)
        decorated.append((cat_score, s))

    decorated.sort(key=lambda x: x[0], reverse=True)

    result = []
    for score, s in decorated[:MAX_SKILLS]:
        skill = dict(s)
        skill["_relevance"] = round(score, 3)
        result.append(skill)

    return result


def _rank_certifications(certifications: list[dict], scored: list[tuple]) -> list[dict]:
    if not scored:
        return certifications

    relevant = [
        (idx, score) for idx, score in scored
        if score >= RELEVANCE_THRESHOLD and idx < len(certifications)
    ]

    result = []
    for idx, score in relevant:
        if idx < len(certifications):
            cert = dict(certifications[idx])
            cert["_relevance"] = round(score, 3)
            result.append(cert)

    return result
