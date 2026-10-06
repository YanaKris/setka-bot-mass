import socket
from urllib.parse import urlsplit

import pytest
from pydantic import ValidationError

from setka_sender.core.config import Settings


def _postgres_reachable(database_url: str) -> bool:
    url = urlsplit(database_url)
    try:
        with socket.create_connection((url.hostname, url.port or 5432), timeout=1.5):
            return True
    except OSError:
        return False


@pytest.fixture(scope="session")
def database_url() -> str:
    """URL БД из настроек приложения (env / .env) — единый источник для integration-тестов."""
    try:
        return Settings().database_url
    except ValidationError:
        pytest.skip("настройки приложения не заданы (env / .env) — integration-тесты пропущены")


@pytest.fixture(scope="session")
def postgres_reachable(database_url) -> bool:
    return _postgres_reachable(database_url)


@pytest.fixture(autouse=True)
def _skip_without_postgres(postgres_reachable):
    if not postgres_reachable:
        pytest.skip("postgres недоступен — integration-тесты пропущены")
