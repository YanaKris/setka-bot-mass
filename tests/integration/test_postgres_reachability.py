import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_postgres_async_connection(database_url):
    """Проверяет реальное async-подключение к postgres через SQLAlchemy.

    Это скелет для интеграционных тестов: показывает, как использовать
    async-движок и фикстуры в тестах против БД. URL берётся только из
    фикстуры database_url (conftest.py) — свой URL в тесте не хардкодим.
    Если postgres недоступен, тест пропускается автоматически через
    _skip_without_postgres (autouse-фикстура в conftest.py).
    """
    engine = create_async_engine(database_url, echo=False)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            assert result.scalar() == 1
    finally:
        await engine.dispose()
