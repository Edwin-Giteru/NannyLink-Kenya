from app.modules.Application.service import ApplicationService
from app.utils.security import get_current_user
from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException
from app.db.models.user import User
from app.modules.Nanny.nanny_repo import NannyRepository

router = APIRouter(tags=["Application"])

@router.post("/apply/{job_id}/nanny/{nanny_id}", status_code=201)
async def apply_to_job(
    job_id: str,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    application_service = ApplicationService(db)
    nanny_repo = NannyRepository(db)

    if not current_user.role == "nanny":
        raise HTTPException(
            status_code=403,
            detail="Only users with nanny role can apply to jobs."
        )   
    
    nanny = await nanny_repo.get_nanny_by_user_id(current_user.id)
    if not nanny:
        raise HTTPException(
            status_code=404,
            detail="Nanny profile not found for the current user."
        )
    result = await application_service.apply_to_job(job_id, nanny.id)
    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    
    return result.data

@router.get("/application/{application_id}")
async def get_application(
    application_id: str,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    application_service = ApplicationService(db)

    if current_user.role != "nanny":
        raise HTTPException(
            status_code=403,
            detail="Only users with nanny role can view applications."
        )
    result = await application_service.get_application_by_id(application_id)
    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data
   
@router.get("/applications/job/{job_id}")
async def get_applications_for_job(
    job_id: str,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    application_service = ApplicationService(db)

    if current_user.role != "family":
        raise HTTPException(
            status_code=403,
            detail="Only users with family role can view applications for a job."
        )
    result = await application_service.get_applications_for_a_job_id(job_id)
    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data