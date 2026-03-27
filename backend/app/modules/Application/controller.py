# from app.modules.Application.service import ApplicationService
# from app.modules.Family.repository import FamilyRepo
# from app.modules.Application.model import ApplicationResponse
# from app.utils.security import get_current_user
# from app.db.session import SessionDep
# from fastapi import APIRouter, Depends, HTTPException
# from app.db.models.user import User
# from app.modules.Nanny.nanny_repo import NannyRepository
# from pydantic import BaseModel
 
# class ApplicationStatusUpdate(BaseModel):
#     status: str   # "reviewing" | "shortlisted" | "accepted" | "rejected"
 
# VALID_STATUSES = {"reviewing", "shortlisted", "accepted", "rejected", "pending", "new"}

# router = APIRouter(tags=["Application"])

# @router.post("/apply/{job_id}", status_code=201)
# async def apply_to_job(
#     job_id: str,
#     db: SessionDep,
#     current_user: User = Depends(get_current_user)
# ):
#     application_service = ApplicationService(db)
#     nanny_repo = NannyRepository(db)

#     if not current_user.role == "nanny":
#         raise HTTPException(
#             status_code=403,
#             detail="Only users with nanny role can apply to jobs."
#         )   
    
#     nanny = await nanny_repo.get_nanny_by_user_id(current_user.id)
#     if not nanny:
#         raise HTTPException(
#             status_code=404,
#             detail="Nanny profile not found for the current user."
#         )
#     result = await application_service.apply_to_job(job_id, nanny.id)
#     if not result.success:
#         raise HTTPException(
#             status_code=result.status_code,
#             detail=result.error
#         )
    
#     return result.data

# @router.patch("/application/{application_id}/status")
# async def update_application_status(
#     application_id: str,
#     body: ApplicationStatusUpdate,
#     db: SessionDep,
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     Allows a family user to update the status of an application
#     on one of their job posts.
#     """
#     if current_user.role != "family":
#         raise HTTPException(
#             status_code=403,
#             detail="Only family users can update application statuses."
#         )
 
#     if body.status.lower() not in VALID_STATUSES:
#         raise HTTPException(
#             status_code=422,
#             detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(VALID_STATUSES)}"
#         )
 
#     application_service = ApplicationService(db)
 
#     # Verify the application exists
#     result = await application_service.get_application_by_id(application_id)
#     if not result.success:
#         raise HTTPException(status_code=result.status_code, detail=result.error)
 
#     application = result.data
 
#     # Verify this application belongs to one of the family's jobs
#     from app.modules.Family.repository import FamilyRepo
#     from app.modules.Job.repository import JobRepository
#     family_repo = FamilyRepo(db)
#     job_repo    = JobRepository(db)
 
#     family = await family_repo.get_family_by_user_id(current_user.id)
#     if not family:
#         raise HTTPException(status_code=404, detail="Family profile not found.")
 
#     job = await job_repo.get_job_by_id(application.job_id)
#     if not job or str(job.family_id) != str(family.id):
#         raise HTTPException(
#             status_code=403,
#             detail="This application does not belong to your job posts."
#         )
 
#     # Apply the status update
#     update_result = await application_service.update_application_status(
#         application_id, body.status.lower()
#     )
#     if not update_result.success:
#         raise HTTPException(
#             status_code=update_result.status_code,
#             detail=update_result.error
#         )
 
#     return update_result.data
 
# @router.get("/applications/family/me", response_model=list[ApplicationResponse])
# async def get_applications_for_my_family(
#     db: SessionDep,
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     Return all applications received across every job post
#     belonging to the authenticated family user.
#     """
#     if current_user.role != "family":
#         raise HTTPException(
#             status_code=403,
#             detail="Only family accounts can access this endpoint."
#         )
 
#     family_repo = FamilyRepo(db)
#     family = await family_repo.get_family_by_user_id(current_user.id)
#     if not family:
#         raise HTTPException(
#             status_code=404,
#             detail="No family profile found. Please create your profile first."
#         )
 
#     application_service = ApplicationService(db)
#     result = await application_service.get_applications_for_family(family.id)
#     if not result.success:
#         raise HTTPException(
#             status_code=result.status_code,
#             detail=result.error
#         )
 
#     return result.data
 
# @router.get("/application/{application_id}")
# async def get_application(
#     application_id: str,
#     db: SessionDep,
#     current_user: User = Depends(get_current_user)
# ):
#     application_service = ApplicationService(db)

#     if current_user.role != "nanny":
#         raise HTTPException(
#             status_code=403,
#             detail="Only users with nanny role can view applications."
#         )
#     result = await application_service.get_application_by_id(application_id)
#     if not result.success:
#         raise HTTPException(
#             status_code=result.status_code,
#             detail=result.error
#         )
#     return result.data
   
# @router.get("/applications/job/{job_id}")
# async def get_applications_for_job(
#     job_id: str,
#     db: SessionDep,
#     current_user: User = Depends(get_current_user)
# ):
#     application_service = ApplicationService(db)

#     if current_user.role != "family":
#         raise HTTPException(
#             status_code=403,
#             detail="Only users with family role can view applications for a job."
#         )
#     result = await application_service.get_applications_for_a_job_id(job_id)
#     if not result.success:
#         raise HTTPException(
#             status_code=result.status_code,
#             detail=result.error
#         )
#     return result.data


# @router.delete("/application/{application_id}")
# async def delete_application(
#     application_id: str,
#     db: SessionDep,
#     current_user: User = Depends(get_current_user)
# ):
#     application_service = ApplicationService(db)

#     if current_user.role != "nanny":
#         raise HTTPException(
#             status_code=403,
#             detail="Only users with nanny role can delete applications."
#         )
#     # get the nanny_id for the current user
#     nanny_repo = NannyRepository(db)
#     nanny = await nanny_repo.get_nanny_by_user_id(current_user.id)
#     if not nanny:
#         raise HTTPException(
#             status_code=404,
#             detail="Nanny profile not found for the current user."
#         )
#     result = await application_service.delete_application(application_id, nanny.id)
#     if not result.success:
#         raise HTTPException(
#             status_code=result.status_code,
#             detail=result.error
#         )
#     return {"detail": "Application deleted successfully."}