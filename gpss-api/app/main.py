from fastapi import FastAPI, Request

from app.api.router import api_router
from app.core.config import settings


app = FastAPI(title='GPSS Utils') #, docs_url=None, redoc_url=None)

app.include_router(api_router, prefix=settings.API_V1_STR)
