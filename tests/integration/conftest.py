import os
import socket
from urllib.parse import urlsplit

import pytest
from pydantic import ValidationError

from setka_sender.core.config import Settings


def _skip_or_fail(reason: str) -> None:
    """Локально без compose — skip; в CI (GitHub выставляет CI=true) — падение.

    Иначе при сломанном service-контейнере integration-набор молча уйдёт в skip
    при зелёной джобе.
    """
    if os.environ.get("CI"):
        pytest.fail(f"{reason}; в CI integration-тесты обязаны выполняться", pytrace=False)
    pytest.skip(f"{reason} — integration-тесты пропущены")


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
        _skip_or_fail("настройки приложения не заданы (env / .env)")


@pytest.fixture(scope="session")
def postgres_reachable(database_url) -> bool:
    return _postgres_reachable(database_url)


@pytest.fixture(autouse=True)
def _skip_without_postgres(postgres_reachable):
    if not postgres_reachable:
        _skip_or_fail("postgres недоступен")
