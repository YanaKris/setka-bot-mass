from fastapi import APIRouter

router = APIRouter(tags=["service"])


@router.get("/health")
async def health() -> dict[str, str]:
    """Проверка живости для healthcheck в docker-compose."""
    return {"status": "ok"}
