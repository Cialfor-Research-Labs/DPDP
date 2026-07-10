from fastapi import APIRouter

router = APIRouter()


@router.get("", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
