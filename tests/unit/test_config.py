from pathlib import Path

import pytest
from pydantic import ValidationError

from setka_sender.core.config import Settings, get_settings

REQUIRED = {
    "DATABASE_URL": "postgresql+asyncpg://app:app@localhost:5432/setka",
    "RABBITMQ_URL": "amqp://guest:guest@localhost:5672/",
    "SETKA_API_BASE_URL": "http://localhost:8001",
    "UPLOADS_DIR": "/data/uploads",
}


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_settings_read_from_env(monkeypatch):
    for key, value in REQUIRED.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("SEND_MAX_RETRIES", "7")
    monkeypatch.setenv("SEND_DELAY_SECONDS", "2.5")

    settings = Settings(_env_file=None)

    assert settings.database_url == REQUIRED["DATABASE_URL"]
    assert settings.rabbitmq_url == REQUIRED["RABBITMQ_URL"]
    assert settings.setka_api_base_url == REQUIRED["SETKA_API_BASE_URL"]
    assert settings.uploads_dir == Path("/data/uploads")
    assert settings.send_max_retries == 7
    assert settings.send_delay_seconds == 2.5


def test_tuning_knobs_have_defaults(monkeypatch):
    for key, value in REQUIRED.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("SEND_MAX_RETRIES", raising=False)
    monkeypatch.delenv("SEND_DELAY_SECONDS", raising=False)

    settings = Settings(_env_file=None)

    assert settings.send_max_retries == 5
    assert settings.send_delay_seconds == 1.0


def test_missing_required_env_fails(monkeypatch):
    for key in REQUIRED:
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_get_settings_is_cached(monkeypatch):
    for key, value in REQUIRED.items():
        monkeypatch.setenv(key, value)

    assert get_settings() is get_settings()
