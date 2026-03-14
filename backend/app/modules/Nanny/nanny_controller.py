from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException, status
from app.modules.Nanny.nanny_service import NannyService
from app.modules.Nanny.nanny_schema import NannyCreate, NannyResponse, NannyUpdate
from app.utils.security import get_current_user
from app.db.models.user import User
from uuid import UUID
from fastapi.responses import JSONResponse


router = APIRouter(tags=["Nanny"], prefix="/Nanny", redirect_slashes=False)


@router.get("/profile/me", response_model=NannyResponse)
async def get_my_profile(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    """
    Returns the full nanny profile for the currently authenticated nanny.
    Used by the dashboard to display the nanny's name, photo, vetting status, etc.
    """
    if current_user.role.lower() != "nanny":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only nanny accounts can access this endpoint."
        )

    service = NannyService(db)
    result = await service.get_nanny(current_user.id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )

    return result.data



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

@router.get("/{nanny_id}", response_model=NannyResponse)
async def get_nanny_by_id(
    nanny_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    """
    Returns a nanny profile by id.
    - Nanny: can only fetch their own profile.
    - Family: can fetch any nanny profile (needed for reviewing applicants).
    - Admin: unrestricted.
    """
    role = current_user.role.lower()
 
    if role == "nanny":
        # Nannies can only read their own profile
        service = NannyService(db)
        result = await service.get_nanny(current_user.id)       # looks up by user_id
        if not result.success:
            raise HTTPException(status_code=result.status_code, detail=result.error)
        # Ensure they're not snooping on someone else's profile
        if str(result.data.id) != str(nanny_id):
            raise HTTPException(status_code=403, detail="You can only view your own profile.")
        return result.data
 
    elif role in ("family", "admin"):
        # Families and admins can look up any nanny by profile id
        service = NannyService(db)
        result = await service.get_nanny_by_profile_id(nanny_id)   # see note below
        if not result.success:
            raise HTTPException(status_code=result.status_code, detail=result.error)
        return result.data
 
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")
 
 

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