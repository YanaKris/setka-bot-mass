import os
import socket
from urllib.parse import urlsplit

import pytest

# Дефолт для интеграционных тестов в контейнере; согласуй с unit-тестами (test_config.py)
_DEFAULT_DATABASE_URL = "postgresql+asyncpg://app:app@postgres:5432/setka"


def _postgres_reachable() -> bool:
    url = urlsplit(os.environ.get("DATABASE_URL", _DEFAULT_DATABASE_URL))
    try:
        with socket.create_connection((url.hostname, url.port or 5432), timeout=1.5):
            return True
    except OSError:
        return False


@pytest.fixture(scope="session")
def postgres_reachable() -> bool:
    return _postgres_reachable()


@pytest.fixture(autouse=True)
def _skip_without_postgres(postgres_reachable):
    if not postgres_reachable:
        pytest.skip("postgres недоступен — integration-тесты пропущены")
