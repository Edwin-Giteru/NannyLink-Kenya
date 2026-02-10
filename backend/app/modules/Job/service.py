from uuid import UUID
from app.modules.Job.repository import JobRepository
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.Job.schema import JobCreate, JobUpdate
from app.utils.results import Result
from app.db.models.job_post import JobPost

class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.job_repo = JobRepository(db)

    async def create_a_job(self, family_id: UUID, job_post: JobCreate) -> Result:
        try:
            result = await self.job_repo.create_job(job_post, family_id)

            if not result:
                return Result.fail(
                    f"Failed to create a job",
                    status_code=500
                )
            return Result.ok(
                data=result,
                status_code=201
            )          
        except Exception as e:
            return Result.fail(
                f"Failed to create due to this error: {str(e)}",
                status_code=500
            )
        
    async def get_a_job_by_id(self, job_id: UUID) -> Result:
        try:
            job = await self.job_repo.get_job_by_id(job_id)

            if not job:
                return Result.fail(
                    f"Job with id: {job_id} is not found",
                    status_code=404
                )
            return Result.ok(
                data=job,
                status_code=200
            )
        
        except Exception as e:
            return Result.fail(
                f"Failed to get the job with id: {job_id} due to the following error: {str(e)}",
                status_code=500
            )
        
    async def update_a_job(self, job_id: UUID, job_update: JobUpdate) -> Result:
        try:            
            Job = await self.db.get(JobPost, job_id)
            
            to_update = job_update.model_dump(exclude_unset=True)
            for field, value in to_update.items():
                if value is not None or value != "":
                    if field != "":
                        setattr(Job, field, value)
            
            await self.db.commit()
            await self.db.refresh(Job)

            response = await self.job_repo.get_job_by_id(Job.id)

            return Result.ok(
                data=response,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"Failed to update the job with id: {job_id} due to this error: {str(e)}",
                status_code=500
            )
    
    async def get_jobs(self) -> Result:
        try:
            jobs = await self.job_repo.get_jobs()
            return Result.ok(
                data=jobs,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"Failed to get jobs due to this error: {str(e)}",
                status_code=500
            )