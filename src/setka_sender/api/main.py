from fastapi import FastAPI

from setka_sender.api.routes import docs, health


def create_app() -> FastAPI:
    app = FastAPI(title="setka-bot-mass", docs_url=None, redoc_url=None)
    app.include_router(health.router)
    app.include_router(docs.router)
    return app


app = create_app()
