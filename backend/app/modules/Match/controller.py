from fastapi import APIRouter, Depends, HTTPException
from app.db.session import SessionDep
from app.modules.Match.service import MatchService
from app.utils.security import get_current_user
from app.db.models.user import User
from uuid import UUID

router = APIRouter(prefix="/connections", tags=["Connections"])

@router.post("/", status_code=201)
async def create_connection(
    nanny_id: UUID, # The ID of the nanny the family wants to hire
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    """Initiate a connection with a nanny."""
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Only families can initiate connections.")
    
    service = MatchService(db)
    result = await service.initiate_connection(current_user.id, nanny_id)
    
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.get("/", status_code=200)
async def get_my_connections(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    """List all active and past connections for the logged-in user."""
    service = MatchService(db)
    result = await service.list_user_connections(current_user.id, current_user.role)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.get("/{id}", status_code=200)
async def get_connection_by_id(
    id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    """Get full details of a specific connection (Contract, Status, etc.)."""
    service = MatchService(db)
    result = await service.get_connection_details(id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    
    # Optional: Basic Security Check
    match = result.data
    # You would ensure current_user.id matches either the nanny or family in the match here
    
    return match