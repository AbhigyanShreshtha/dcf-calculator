from fastapi import APIRouter

from app.api.routes import dcf, health, models


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(dcf.router, prefix="/dcf", tags=["dcf"])
api_router.include_router(models.router, prefix="/models", tags=["models"])

