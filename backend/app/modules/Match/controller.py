from fastapi import APIRouter, Depends, HTTPException
from app.db.session import SessionDep
from app.modules.Match.service import MatchService
from app.utils.security import get_current_user
from app.db.models.user import User
from uuid import UUID

router = APIRouter(prefix="/connections", tags=["Connections"])

@router.post("/", status_code=201)
async def create_connection(
    nanny_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Only families can initiate connections.")
    
    service = MatchService(db)
    result = await service.initiate_connection(current_user.id, nanny_id)
    
    # This will now catch the "Limit reached" 400 error from the service
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
        
    return result.data

@router.get("/discovery", status_code=200)
async def get_discovery_nannies(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Discovery is for families only.")
    
    service = MatchService(db)
    result = await service.get_discovery_list(current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    
    return result.data

@router.get("/", status_code=200)
async def get_my_connections(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
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
    service = MatchService(db)
    result = await service.get_connection_details(id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    
    return result.data


