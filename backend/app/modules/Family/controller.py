from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException, status
from app.modules.Family.service import FamilyService
from app.modules.Family.schema import FamilyCreate, FamilyUpdate, FamilyResponse
from app.utils.security import get_current_user
from app.db.models.user import User
import uuid
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Family"], prefix="/Family")

@router.post("/", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family(
    family: FamilyCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with the family role can create nanny profiles."
        )

    service = FamilyService(db)
    result = await service.create_family(family, current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )

    return result.data

@router.patch("/{user_id}")
async def update_family(
    family: FamilyUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(
            status_code=403,
            detail="Only users with the role of a familly can perform this action"
        )

    service = FamilyService(db)
    result = await service.update_family(family, current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data

@router.get("/{user_id}")
async def get_a_family(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(
            status_code=403,
            detail="Only users with the role of a family can perform this action"
        )
    
    service = FamilyService(db)
    result = await service.get_family(current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data
