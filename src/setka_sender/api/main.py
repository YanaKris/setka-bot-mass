from fastapi import FastAPI

from setka_sender.api.routes import health


def create_app() -> FastAPI:
    app = FastAPI(title="setka-bot-mass")
    app.include_router(health.router)
    return app


app = create_app()
