from fastapi import APIRouter

from app.api.routes import audits, health, reports, review, vector

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(audits.router, prefix="/audits", tags=["audits"])
api_router.include_router(review.router, prefix="/review", tags=["review"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(vector.router, prefix="/vector", tags=["vector"])
