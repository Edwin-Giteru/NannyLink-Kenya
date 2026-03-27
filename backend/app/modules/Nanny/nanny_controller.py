from fastapi import APIRouter, Depends, HTTPException, status
from app.db.session import SessionDep
from app.modules.Nanny.nanny_service import NannyService
from app.modules.Nanny.nanny_schema import NannyCreate, NannyResponse, NannyUpdate
from app.utils.security import get_current_user
from app.db.models.user import User
from uuid import UUID

router = APIRouter(tags=["Nanny"], prefix="/nannies")

# --- PUBLIC ENDPOINTS ---

@router.get("/", response_model=list[dict])
async def get_all_nannies(db: SessionDep):
    """Publicly list nannies for browsing."""
    service = NannyService(db)
    nannies = await service.nanny_repository.get_public_nannies()
    return [
        {
            "id": n.id,
            "name": n.name,
            "experience": n.years_experience,
            "location": n.address,
            "photo": n.profile_photo_url,
            "skills": n.skills
        } for n in nannies
    ]

@router.post("/profile", response_model=NannyResponse, status_code=status.HTTP_201_CREATED)
async def create_my_profile(
    nanny_data: NannyCreate, 
    db: SessionDep, 
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint for a newly registered user with role 'nanny' to create their profile.
    """
    # Safety check: Ensure the user actually has the 'nanny' role
    if current_user.role != "nanny":
        raise HTTPException(
            status_code=403, 
            detail="Only users with the 'nanny' role can create a nanny profile."
        )

    service = NannyService(db)
    result = await service.create_nanny_profile(nanny_data, current_user.id)
    
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    
    return result.data

@router.get("/profile/me", response_model=NannyResponse)
async def get_my_profile(db: SessionDep, current_user: User = Depends(get_current_user)):
    if current_user.role != "nanny":
        raise HTTPException(status_code=403, detail="Nanny access only.")
    
    service = NannyService(db)
    result = await service.get_nanny_by_user(current_user.id) 
    
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.put("/profile", response_model=NannyResponse)
async def update_my_profile(
    nanny_update: NannyUpdate, 
    db: SessionDep, 
    current_user: User = Depends(get_current_user)
):
    service = NannyService(db)
    result = await service.update_nanny_profile(nanny_update, current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.get("/connections")
async def get_nanny_matches(db: SessionDep, current_user: User = Depends(get_current_user)):
    """List of all families this nanny is connected with."""
    if current_user.role != "nanny":
        raise HTTPException(status_code=403, detail="Nanny access only.")
    
    service = NannyService(db)
    result = await service.get_nanny_connections(current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.get("/{id}", response_model=NannyResponse)
async def get_nanny_public_profile(id: UUID, db: SessionDep):
    """Public detail view for a nanny profile."""
    service = NannyService(db)
    result = await service.get_nanny_by_profile_id(id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

# --- PROTECTED / PRIVATE ENDPOINTS ---



@router.get("/{id}/full")
async def get_nanny_full_details(id: UUID, db: SessionDep, current_user: User = Depends(get_current_user)):
    """Protected view: Includes contact/ID info for Admins or Connected Families."""
    if current_user.role not in ["admin", "family"]:
        raise HTTPException(status_code=403, detail="Unauthorized to view sensitive details.")
    
    service = NannyService(db)
    result = await service.get_full_nanny_details(id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

# app/modules/Nanny/router.py

