from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException, status
from app.modules.Family.service import FamilyService
from app.modules.Family.schema import FamilyCreate, FamilyUpdate, FamilyResponse
from app.utils.security import get_current_user
from app.db.models.user import User
import uuid

router = APIRouter(tags=["Family"], prefix="/families")

@router.post("/", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family_profile(
    family_data: FamilyCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Only family accounts can create family profiles.")

    service = FamilyService(db)
    result = await service.create_family(family_data, current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.get("/profile/me")
async def get_my_family_profile(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Family access only.")
    
    service = FamilyService(db)
    result = await service.get_family_dashboard_data(current_user.id) # Use the new stats method
    if not result["success"]:
        raise HTTPException(status_code=result["status_code"], detail=result["error"])
    return result["data"]

@router.patch("/profile/me", response_model=FamilyResponse)
async def update_my_family_profile(
    family_update: FamilyUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Only families can perform this action.")

    service = FamilyService(db)
    result = await service.update_family(family_update, current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.get("/connections")
async def get_family_connections(
    db: SessionDep, 
    current_user: User = Depends(get_current_user)
):
    """Returns a list of all nannies this family has initiated a connection with."""
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Access denied.")
    
    service = FamilyService(db)
    result = await service.get_family_connections(current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data