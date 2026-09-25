from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from scalar_fastapi import get_scalar_api_reference

router = APIRouter(include_in_schema=False)


@router.get("/docs")
async def scalar_docs(request: Request) -> HTMLResponse:
    """Scalar API Reference вместо стандартного Swagger UI."""
    return get_scalar_api_reference(
        openapi_url=request.app.openapi_url,
        title=request.app.title,
        telemetry=False,
    )
