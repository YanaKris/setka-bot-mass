import httpx
import pytest

from setka_sender.api.main import create_app


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
