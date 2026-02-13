from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException, status
from app.modules.Nanny.nanny_service import NannyService
from app.modules.Nanny.nanny_schema import NannyCreate, NannyResponse, NannyUpdate
from app.utils.security import get_current_user
from app.db.models.user import User
import uuid
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Nanny"], prefix="/Nanny", redirect_slashes=False)

@router.post("", response_model=NannyResponse, status_code=status.HTTP_201_CREATED)
async def create_nanny(
    nanny_create: NannyCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role.upper() != "NANNY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with the nanny role can create nanny profiles."
        )

    nanny_service = NannyService(db)
    result = await nanny_service.create_nanny(nanny_create, current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )

    return result.data

@router.patch("/")
async def update_nanny(
    nanny_update: NannyUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "nanny":
        raise HTTPException(
            status_code=403,
            detail="Only users with the role of a nanny can perform this action"
        )

    service = NannyService(db)
    result = await service.update_nanny(nanny_update, current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data

@router.get("/{nanny_id}")
async def get_a_nanny(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "nanny":
        raise HTTPException(
            status_code=403,
            detail="Only users with the role of a nanny can perform this action"
        )
    
    service = NannyService(db)
    result = await service.get_nanny(current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data


@router.get("/applications/{nanny_id}")
async def get_applications_for_nanny(   
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "nanny":
        raise HTTPException(
            status_code=403,
            detail="Only users with the role of a nanny can perform this action"
        )
    
    service = NannyService(db)
    result = await service.get_applications_for_nanny(current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data

@router.delete("/{nanny_id}")
async def delete_nanny(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "nanny":
        raise HTTPException(
            status_code=403,
            detail="Only users with the role of a nanny can perform this action"
        )
    
    service = NannyService(db)
    result = await service.delete_nanny(current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return JSONResponse(content={"message": "Nanny profile deleted successfully"}, status_code=200)