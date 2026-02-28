import httpx
from bs4 import BeautifulSoup
import re


async def scrape_job_url(url: str) -> str | None:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except httpx.HTTPError:
        return None

    soup = BeautifulSoup(response.text, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    job_selectors = [
        {"class_": re.compile(r"job[-_]?desc|description|posting|details", re.I)},
        {"id": re.compile(r"job[-_]?desc|description|posting|details", re.I)},
        {"class_": re.compile(r"content|main|body", re.I)},
    ]

    for selector in job_selectors:
        container = soup.find("div", **selector) or soup.find("section", **selector) or soup.find("article", **selector)
        if container:
            text = container.get_text(separator="\n", strip=True)
            if len(text) > 100:
                return _clean_text(text)

    body = soup.find("body")
    if body:
        text = body.get_text(separator="\n", strip=True)
        if len(text) > 100:
            return _clean_text(text)

    return None


def _clean_text(text: str) -> str:
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        line = line.strip()
        if line and len(line) > 1:
            cleaned.append(line)
    return "\n".join(cleaned)
