async def test_docs_serves_scalar(client):
    response = await client.get("/docs")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "@scalar/api-reference" in response.text
    assert "swagger-ui" not in response.text


async def test_openapi_schema_available(client):
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "setka-bot-mass"


async def test_redoc_disabled(client):
    response = await client.get("/redoc")

    assert response.status_code == 404
