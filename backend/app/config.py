from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    """App settings loaded from environment / backend/.env. No credential defaults."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    postgres_user: str = "resibo"
    postgres_password: str = ""  # must be set in .env
    postgres_db: str = "resibo"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    llm_provider: str = "ollama"  # ollama | openai_compat
    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "qwen2.5:7b"
    embed_model: str = "nomic-embed-text"
    openai_compat_base_url: str = ""
    openai_compat_api_key: str = ""
    citation_match_threshold: int = 90

    @property
    def database_url(self) -> URL:
        """Built from parts so no full credential string lives in code or docs."""
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password or None,
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
