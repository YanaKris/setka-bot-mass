from fastapi import FastAPI

from setka_sender.api.main import app


async def test_health_returns_ok(client):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_module_level_app_is_fastapi_instance():
    assert isinstance(app, FastAPI)
