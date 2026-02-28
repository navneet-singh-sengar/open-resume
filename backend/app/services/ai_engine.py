import json
import re
import os
import logging
import litellm
from app.config import get_settings

logger = logging.getLogger(__name__)

_keys_configured = False


def reset_keys():
    """Clear the configured flag so keys are re-read on next LLM call."""
    global _keys_configured
    _keys_configured = False


def _configure_keys():
    global _keys_configured
    if _keys_configured:
        return
    settings = get_settings()

    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
    if settings.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)

    gemini_key = settings.gemini_api_key or settings.google_api_key
    if gemini_key:
        os.environ.setdefault("GEMINI_API_KEY", gemini_key)

    _keys_configured = True


async def call_llm(system_prompt: str, user_prompt: str, model: str | None = None) -> str:
    _configure_keys()
    settings = get_settings()
    model = model or settings.default_model
    is_ollama = model.startswith("ollama/")

    kwargs: dict = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "top_p": 0.9,
        "max_tokens": 8192,
    }

    is_openai = model.startswith("gpt-") or model.startswith("o1") or model.startswith("o3")
    model_lower = model.lower()
    supports_json_mode = not is_ollama and "gemma" not in model_lower

    if is_ollama:
        kwargs["api_base"] = settings.ollama_base_url
    if supports_json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if is_openai:
        kwargs["frequency_penalty"] = 0.1

    response = await litellm.acompletion(**kwargs)

    return response.choices[0].message.content


def _repair_json(raw: str) -> str:
    """Best-effort repair of common LLM JSON mistakes."""
    text = raw.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
        text = text.strip()

    # Extract JSON object/array if surrounded by other text
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if match:
        text = match.group(1)

    # Remove single-line comments (// ...)
    text = re.sub(r"//[^\n]*", "", text)

    # Remove trailing commas before } or ]
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # Replace single-quoted strings with double-quoted strings.
    # This handles the pattern: 'some value' -> "some value"
    # Only outside of already double-quoted strings.
    def _fix_single_quotes(t: str) -> str:
        result = []
        i = 0
        while i < len(t):
            if t[i] == '"':
                # Skip double-quoted string
                result.append(t[i])
                i += 1
                while i < len(t) and t[i] != '"':
                    if t[i] == '\\':
                        result.append(t[i])
                        i += 1
                        if i < len(t):
                            result.append(t[i])
                            i += 1
                    else:
                        result.append(t[i])
                        i += 1
                if i < len(t):
                    result.append(t[i])
                    i += 1
            elif t[i] == "'":
                # Replace single quote with double quote
                result.append('"')
                i += 1
                while i < len(t) and t[i] != "'":
                    if t[i] == '"':
                        result.append('\\"')
                    elif t[i] == '\\' and i + 1 < len(t) and t[i + 1] == "'":
                        result.append("'")
                        i += 1
                    else:
                        result.append(t[i])
                    i += 1
                result.append('"')
                if i < len(t):
                    i += 1
            else:
                result.append(t[i])
                i += 1
        return "".join(result)

    text = _fix_single_quotes(text)

    # Remove control characters that break JSON (except \n \r \t)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)

    return text


async def call_llm_json(system_prompt: str, user_prompt: str, model: str | None = None) -> dict:
    raw = await call_llm(system_prompt, user_prompt, model)

    # Attempt 1: parse as-is
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Attempt 2: repair and parse
    repaired = _repair_json(raw)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass

    # Attempt 3: log the raw output and raise with context
    logger.error("Failed to parse LLM JSON after repair.\nRaw:\n%s\nRepaired:\n%s", raw[:3000], repaired[:3000])
    raise ValueError(f"AI returned malformed JSON that could not be repaired. First 200 chars: {raw[:200]}")
