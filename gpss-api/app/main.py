from fastapi import FastAPI, Request

from app.api.router import api_router
from app.core.config import settings


app = FastAPI(
    title="GPSS API",
    version="1.0.0",
    root_path="/gpss-api",  # ← ДОБАВЬТЕ ЭТУ СТРОКУ!
    docs_url="/docs",
    openapi_url="/openapi.json"
)

app.include_router(api_router, prefix=settings.API_V1_STR)
