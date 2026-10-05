import os

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_postgres_async_connection():
    """Проверяет реальное async-подключение к postgres через SQLAlchemy.

    Это скелет для интеграционных тестов: показывает, как использовать
    async-движок, async-сессии и фикстуры для тестов с БД.
    Если postgres недоступен, тест пропускается автоматически через
    _skip_without_postgres (autouse-фикстура в conftest.py).
    """
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://app:app@postgres:5432/setka",
    )
    engine = create_async_engine(database_url, echo=False)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            assert result.scalar() == 1
    finally:
        await engine.dispose()
