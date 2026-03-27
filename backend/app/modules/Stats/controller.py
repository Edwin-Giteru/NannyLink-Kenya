from fastapi import APIRouter, Depends, HTTPException
from app.db.session import SessionDep
from .stat_service import StatsService

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/")
async def get_stats(db: SessionDep):
    service = StatsService(db)
    result = await service.get_platform_stats()

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )

    return result.data