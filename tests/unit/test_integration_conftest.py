"""Поведение tests/integration/conftest.py: локально — skip, в CI — падение.

Без этого integration-набор в CI мог бы молча уйти в skip при зелёной джобе.
Проверяем через pytester: настоящий conftest копируется во временный каталог
и запускается вложенная pytest-сессия.
"""

from pathlib import Path

import pytest

pytest_plugins = ["pytester"]

INTEGRATION_CONFTEST = Path(__file__).parents[1] / "integration" / "conftest.py"

SETTINGS_ENV = {
    "RABBITMQ_URL": "amqp://guest:guest@127.0.0.1:5672/",
    "SETKA_API_BASE_URL": "http://127.0.0.1:8001",
}
# Порт 1 на localhost заведомо закрыт — postgres «недоступен».
UNREACHABLE_DATABASE_URL = "postgresql+asyncpg://app:app@127.0.0.1:1/setka"
ALL_SETTINGS = [*SETTINGS_ENV, "UPLOADS_DIR", "DATABASE_URL"]


@pytest.fixture
def run_integration_test(pytester, monkeypatch):
    # Вложенная сессия не видит pyproject.toml — без этого pytest-asyncio шумит предупреждением.
    pytester.makeini("[pytest]\nasyncio_default_fixture_loop_scope = function\n")
    pytester.makeconftest(INTEGRATION_CONFTEST.read_text(encoding="utf-8"))
    pytester.makepyfile("def test_needs_postgres():\n    pass\n")
    for key in [*ALL_SETTINGS, "CI"]:
        monkeypatch.delenv(key, raising=False)

    def run(*, ci: bool, settings: bool):
        if ci:
            monkeypatch.setenv("CI", "true")
        if settings:
            for key, value in SETTINGS_ENV.items():
                monkeypatch.setenv(key, value)
            monkeypatch.setenv("UPLOADS_DIR", str(pytester.path / "uploads"))
            monkeypatch.setenv("DATABASE_URL", UNREACHABLE_DATABASE_URL)
        return pytester.runpytest_inprocess("-p", "no:cacheprovider")

    return run


def test_unreachable_postgres_is_skipped_locally(run_integration_test):
    result = run_integration_test(ci=False, settings=True)
    result.assert_outcomes(skipped=1)


def test_missing_settings_are_skipped_locally(run_integration_test):
    result = run_integration_test(ci=False, settings=False)
    result.assert_outcomes(skipped=1)


def test_unreachable_postgres_fails_in_ci(run_integration_test):
    result = run_integration_test(ci=True, settings=True)
    result.assert_outcomes(errors=1)
    result.stdout.fnmatch_lines(["*postgres недоступен*"])


def test_missing_settings_fail_in_ci(run_integration_test):
    result = run_integration_test(ci=True, settings=False)
    result.assert_outcomes(errors=1)
    result.stdout.fnmatch_lines(["*настройки приложения не заданы*"])
