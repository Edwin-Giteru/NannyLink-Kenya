from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.job_post import JobPost
from app.modules.Job.schema import JobCreate
from uuid import UUID
from sqlalchemy.future import select

class JobRepository:
    def __init__(
            self,
            db: AsyncSession
    ):
        
        self.db = db
    
    async def save(self, job: JobPost) -> JobPost:
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def create_job(self, job_post: JobCreate, family_id: UUID):
        new_job = JobPost(**job_post.model_dump(), family_id=family_id)
        return await self.save(new_job)
    
    async def get_job_by_id(self, job_id: UUID) -> JobPost:
        stmt = select(JobPost).where(JobPost.id == job_id)
        result = await self.db.execute(stmt)
        return  result.scalar_one_or_none()
    
    async def get_a_family_with_job_id(self, family_id: UUID, job_id: UUID):
        stmt = select(JobPost).where(JobPost.family_id==family_id, JobPost.id == job_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
