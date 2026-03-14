from app.db.session import SessionDep
from app.modules.Job.service import JobService
from app.modules.Job.schema import JobCreate, JobResponse, JobUpdate
from fastapi import APIRouter, HTTPException, status, Depends
from app.modules.Family.repository import FamilyRepo
from app.utils.security import get_current_user
from app.db.models.user import User
from uuid import UUID

router = APIRouter(tags=["Job"], prefix="/job")

# ─────────────────────────────────────────────────────────────────────────────
# IMPORTANT: All fixed-path routes (/me, /family/me, /) MUST come before
# wildcard routes (/{job_id}) — otherwise FastAPI matches the literal string
# as a UUID and returns 422 or 405.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/me", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_a_job(
    db: SessionDep,
    job_create: JobCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a job post for the authenticated family user.
    Family is resolved from the JWT — no family_id needed in the URL.
    """
    if current_user.role != "family":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User with id {current_user.id} is not authorized to perform this action"
        )

    family_repo = FamilyRepo(db)
    family = await family_repo.get_family_by_user_id(current_user.id)
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id: {current_user.id} has no family profile"
        )

    service = JobService(db)
    result = await service.create_a_job(family.id, job_create)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)

    return result.data


@router.get("/family/me", response_model=list[JobResponse])
async def get_my_family_jobs(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    """Return all job posts belonging to the authenticated family user."""
    if current_user.role != "family":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only family accounts can access this endpoint."
        )

    family_repo = FamilyRepo(db)
    family = await family_repo.get_family_by_user_id(current_user.id)
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family profile found. Please create one first."
        )

    service = JobService(db)
    result = await service.get_jobs_by_family(family.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)

    return result.data


@router.get("/", response_model=list[JobResponse])
async def get_jobs(db: SessionDep):
    """Return all job posts (public — no auth required)."""
    service = JobService(db)
    result = await service.get_jobs()
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data


# ── Wildcard routes LAST ──────────────────────────────────────────────────────

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(db: SessionDep, job_id: UUID):
    service = JobService(db)
    result = await service.get_a_job_by_id(job_id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    db: SessionDep,
    job_id: UUID,
    job_update: JobUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "family":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized to perform this action"
        )
    service = JobService(db)
    result = await service.update_a_job(job_id, job_update)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data


@router.get("/{job_id}/family-name")
async def get_family_name_by_job_id(db: SessionDep, job_id: UUID):
    service = JobService(db)
    result = await service.get_family_name_by_job_id(job_id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data