from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.application import Application
from uuid import UUID

class ApplicationRepository:
    def __init__(
            self, 
            db: AsyncSession
    ):
        self.db = db

    async def save(self, application: Application) -> Application:
        self.db.add(application)
        await self.db.commit()
        await self.db.refresh(application)
        return application
    

    async def create_application(self, job_id: UUID, nanny_id: UUID) -> Application:
        new_application = Application(job_id=job_id, nanny_id=nanny_id)
        return await self.save(new_application)
    
    async def get_application_by_id(self, application_id: UUID) -> Application:
        stmt = select(Application).where(Application.id == application_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_applications_for_a_job_id(self, job_id: UUID) -> list[Application]:
        stmt = select(Application).where(Application.job_id == job_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_nanny_id_for_a_job_id(self, job_id: UUID) -> list[UUID]:
        stmt = select(Application.nanny_id).where(Application.job_id == job_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()