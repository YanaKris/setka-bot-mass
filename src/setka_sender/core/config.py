from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Конфигурация приложения. Источник — переменные окружения и `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    rabbitmq_url: str
    setka_api_base_url: str
    uploads_dir: Path

    send_max_retries: int = 5
    send_delay_seconds: float = 1.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
