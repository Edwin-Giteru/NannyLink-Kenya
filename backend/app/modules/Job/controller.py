from app.db.session import SessionDep
from app.modules.Job.service import JobService
from app.modules.Job.schema import JobCreate, JobResponse, JobUpdate
from fastapi import APIRouter, HTTPException, status, Depends
from app.modules.Family.repository import FamilyRepo
from app.utils.security import get_current_user
from app.db.models.user import User
from uuid import UUID

router = APIRouter(tags=["Job"], prefix="/job")

@router.post("/{family_id}", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_a_job(
        db: SessionDep,
        job_create: JobCreate,
        current_user: User = Depends(get_current_user)
):
    """
    Docstring for create_a_job
    
    :param db: Description
    :type db: SessionDep
    :param job_create: Description
    :type job_create: JobCreate
    :param current_user: Description
    :type current_user: User
    """
    service = JobService(db)
    family_repo = FamilyRepo(db)

    if current_user.role != "family":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user.id} is not authorized to perform this action"
        )
    
    family = await family_repo.get_family_by_user_id(current_user.id)
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id: {current_user.id}, has no family profile"
        )
    
    result = await service.create_a_job(family.id, job_create)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    
    return result.data

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    db: SessionDep,
    job_id: UUID
):
    """
    Docstring for get_job
    
    :param db: Description
    :type db: SessionDep
    :param job_id: Description
    :type job_id: UUID
    """

    service = JobService(db)

    result = await service.get_a_job_by_id(job_id)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    
    return result.data

@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    db: SessionDep,
    job_id: UUID,
    job_update: JobUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Docstring for update_job
    
    :param db: Description
    :type db: SessionDep
    :param job_id: Description
    :type job_id: UUID
    :param job_update: Description
    :type job_update: JobUpdate
    :param current_user: Description
    :type current_user: User
    """

    service = JobService(db)

    if current_user.role != "family":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized to perform this action"
        )
    
    result = await service.update_a_job(job_id, job_update)

    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    
    return result.data