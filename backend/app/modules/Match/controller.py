from fastapi import APIRouter, Depends, HTTPException
from app.db.session import SessionDep
from app.modules.Match.service import MatchService
from uuid import UUID
from app.utils.security import get_current_user
from app.db.models.user import User

router = APIRouter(tags=["Match"])

@router.post("/matches/", status_code=201)
async def create_match(
    application_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user)

):
    match_service = MatchService(db)
    if current_user.role != "family":
        raise HTTPException(
            status_code=403,
            detail="Only family users can create matches."
        )
    
    result = await match_service.create_match(application_id)
    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    
    return result.data