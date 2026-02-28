from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""
    gemini_api_key: str = ""
    default_model: str = "gemini/gemini-3-flash-preview"
    database_url: str = "sqlite:///./open_resume.db"
    ollama_base_url: str = "http://localhost:11434"
    embedding_model: str = "nomic-embed-text"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
