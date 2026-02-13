from app.modules.Application.repository import ApplicationRepository
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.utils.results import Result
from app.modules.Nanny.nanny_repo import NannyRepository

class ApplicationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.application_repo = ApplicationRepository(db)
        self.nanny_repo = NannyRepository(db)

    async def apply_to_job(self, job_id: UUID, nanny_id: UUID) -> Result:
        try:
            """Check if nanny vetting_status is approved """
            nanny = await self.nanny_repo.get_nanny_by_id(nanny_id)
            if not nanny:
                return Result.fail(
                    f"Nanny with id {nanny_id} does not exist.",
                    status_code=404
                )
            # if nanny.vetting_status != "approved":
            #     return Result.fail(
            #         f"Nanny with id {nanny_id} is not approved for applications.",
            #         status_code=403
            #     )

            new_application = await self.application_repo.create_application(job_id, nanny_id)

            if not new_application:
                return Result.fail(
                    f"Failed to create application for job_id: {job_id} and nanny_id: {nanny_id}",
                    status_code=500
                )
            return Result.ok(
                data=new_application,
                status_code=201
            )
        except Exception as e:
            return Result.fail(
                f"An error occurred while creating application: {str(e)}",
                status_code=500
            )
    
    async def get_application_by_id(self, application_id: UUID) -> Result:
        try:
            application = await self.application_repo.get_application_by_id(application_id)
            if not application:
                return Result.fail(
                    f"Application with id {application_id} not found.",
                    status_code=404
                )
            return Result.ok(
                data=application,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"An error occurred while retrieving application: {str(e)}",
                status_code=500
            )
    
    async def get_applications_for_a_job_id(self, job_id: UUID) -> Result:
        try:
            applications = await self.application_repo.get_applications_for_a_job_id(job_id)
            return Result.ok(
                data=applications,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"An error occurred while retrieving applications for job_id {job_id}: {str(e)}",
                status_code=500
            )