import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.settings import AppSetting, CustomModel, HiddenModel
from app.models.profile import PersonalInfo
from app.config import get_settings

router = APIRouter()

BUILT_IN_MODELS = [
    {"value": "gemini/gemini-3-flash-preview", "label": "Gemini 3 Flash Preview (Google) — Recommended", "provider": "google"},
    {"value": "gemini/gemini-2.5-flash", "label": "Gemini 2.5 Flash (Google)", "provider": "google"},
    {"value": "gemini/gemini-2.5-flash-lite", "label": "Gemini 2.5 Flash Lite (Google)", "provider": "google"},
    {"value": "gemini/gemma-3-27b-it", "label": "Gemma 3 27B (Google — Open Model)", "provider": "google"},
    {"value": "gemini/gemma-3-12b-it", "label": "Gemma 3 12B (Google — Open Model)", "provider": "google"},
    {"value": "gemini/gemma-3-4b-it", "label": "Gemma 3 4B (Google — Open Model)", "provider": "google"},
    {"value": "ollama/mistral", "label": "Mistral 7B (Local — Ollama)", "provider": "ollama"},
    {"value": "ollama/llama3.1", "label": "Llama 3.1 8B (Local — Ollama)", "provider": "ollama"},
    {"value": "ollama/gemma2", "label": "Gemma 2 9B (Local — Ollama)", "provider": "ollama"},
]

SETTING_KEYS = {
    "google_api_key",
    "openai_api_key",
    "anthropic_api_key",
    "gemini_api_key",
    "ollama_base_url",
    "default_model",
    "embedding_model",
}


def _mask_key(value: str) -> str:
    """Mask API key values for safe display, keeping first 4 and last 4 chars."""
    if not value or len(value) <= 12:
        return value
    return value[:4] + "***" + value[-4:]


def _should_mask(key: str) -> bool:
    return key.endswith("_key")


# ─── Settings CRUD ───

@router.get("/")
def get_settings_endpoint(db: Session = Depends(get_db)):
    settings = get_settings()
    result: dict[str, str] = {}

    for key in SETTING_KEYS:
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row and row.value:
            result[key] = _mask_key(row.value) if _should_mask(key) else row.value
        else:
            env_val = getattr(settings, key, "")
            result[key] = _mask_key(env_val) if _should_mask(key) else env_val

    return result


class SettingsUpdateRequest(BaseModel):
    settings: dict[str, str]


@router.put("/")
def update_settings_endpoint(data: SettingsUpdateRequest, db: Session = Depends(get_db)):
    from app.services.ai_engine import reset_keys

    updated = []
    for key, value in data.settings.items():
        if key not in SETTING_KEYS:
            continue
        if "***" in value:
            continue

        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row:
            row.value = value
        else:
            db.add(AppSetting(key=key, value=value))
        updated.append(key)

    db.commit()

    _apply_db_settings_to_env(db)
    get_settings.cache_clear()
    reset_keys()

    return {"updated": updated}


def _apply_db_settings_to_env(db: Session):
    """Push DB-stored API keys into os.environ so LiteLLM picks them up."""
    key_env_map = {
        "google_api_key": "GEMINI_API_KEY",
        "gemini_api_key": "GEMINI_API_KEY",
        "openai_api_key": "OPENAI_API_KEY",
        "anthropic_api_key": "ANTHROPIC_API_KEY",
    }
    for setting_key, env_var in key_env_map.items():
        row = db.query(AppSetting).filter(AppSetting.key == setting_key).first()
        if row and row.value:
            os.environ[env_var] = row.value


def get_db_setting(db: Session, key: str) -> str | None:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    return row.value if row else None


# ─── Ollama Status ───

@router.get("/ollama-status")
async def ollama_status(db: Session = Depends(get_db)):
    settings = get_settings()
    url_row = db.query(AppSetting).filter(AppSetting.key == "ollama_base_url").first()
    base_url = (url_row.value if url_row and url_row.value else settings.ollama_base_url).rstrip("/")

    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{base_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                model_names = [m.get("name", "") for m in data.get("models", [])]
                return {"running": True, "models": model_names}
    except Exception:
        pass
    return {"running": False, "models": []}


# ─── Setup Status ───

API_KEY_FIELDS = ["gemini_api_key", "google_api_key", "openai_api_key", "anthropic_api_key"]

@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)):
    settings = get_settings()

    has_api_key = False
    for key in API_KEY_FIELDS:
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row and row.value:
            has_api_key = True
            break
        env_val = getattr(settings, key, "")
        if env_val:
            has_api_key = True
            break

    has_profile = db.query(PersonalInfo).first() is not None

    return {"has_api_key": has_api_key, "has_profile": has_profile}


# ─── Models CRUD ───

BUILT_IN_VALUES = {m["value"] for m in BUILT_IN_MODELS}


@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    hidden_values = {h.value for h in db.query(HiddenModel).all()}
    custom_rows = db.query(CustomModel).all()

    models = []
    for m in BUILT_IN_MODELS:
        if m["value"] not in hidden_values:
            models.append({**m, "builtin": True})

    for row in custom_rows:
        if row.value not in BUILT_IN_VALUES:
            models.append({
                "id": row.id,
                "value": row.value,
                "label": row.label,
                "provider": row.provider,
                "custom": True,
            })

    return models


@router.get("/models/hidden")
def list_hidden_models(db: Session = Depends(get_db)):
    hidden_values = {h.value for h in db.query(HiddenModel).all()}
    return [m for m in BUILT_IN_MODELS if m["value"] in hidden_values]


class ModelCreateRequest(BaseModel):
    value: str
    label: str
    provider: str


@router.post("/models")
def add_model(data: ModelCreateRequest, db: Session = Depends(get_db)):
    if not data.value.strip() or not data.label.strip():
        raise HTTPException(status_code=400, detail="Model value and label are required")

    existing = db.query(CustomModel).filter(CustomModel.value == data.value).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Model '{data.value}' already exists")

    model = CustomModel(
        value=data.value.strip(),
        label=data.label.strip(),
        provider=data.provider.strip(),
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return {"id": model.id, "value": model.value, "label": model.label, "provider": model.provider}


class ModelValueRequest(BaseModel):
    value: str


@router.post("/models/hide")
def hide_builtin_model(data: ModelValueRequest, db: Session = Depends(get_db)):
    if data.value not in BUILT_IN_VALUES:
        raise HTTPException(status_code=400, detail="Only built-in models can be hidden")
    existing = db.query(HiddenModel).filter(HiddenModel.value == data.value).first()
    if not existing:
        db.add(HiddenModel(value=data.value))
        db.commit()
    return {"hidden": True}


@router.post("/models/unhide")
def unhide_builtin_model(data: ModelValueRequest, db: Session = Depends(get_db)):
    row = db.query(HiddenModel).filter(HiddenModel.value == data.value).first()
    if row:
        db.delete(row)
        db.commit()
    return {"unhidden": True}


@router.delete("/models/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db)):
    model = db.query(CustomModel).filter(CustomModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(model)
    db.commit()
    return {"deleted": True}
