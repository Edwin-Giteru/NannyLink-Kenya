from app.db.models.nanny_profile import NannyProfile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.modules.Nanny.nanny_schema import NannyCreate, NannyUpdate
from typing import List
import uuid
from app.db.models.user import User
from app.db.models.application import Application


class NannyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def save(self, nanny: NannyProfile) -> NannyProfile:
        self.db.add(nanny)
        await self.db.flush()
        await self.db.refresh(nanny)
        return nanny
    
    async def create_nanny(self, nanny_create: NannyCreate, user_id: uuid.UUID) -> NannyProfile:
        new_nanny = NannyProfile(**nanny_create.model_dump(), user_id=user_id)
        return await self.save(new_nanny)
    
    async def get_nanny_by_user_id(self, user_id: uuid.UUID) -> NannyProfile | None:
        stmt = select(NannyProfile).where(NannyProfile.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_nanny_by_id(self, nanny_id: uuid.UUID) -> NannyProfile | None:
        stmt = select(NannyProfile).where(NannyProfile.id == nanny_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_nannies(self) -> list[NannyProfile]:
        stmt = select(NannyProfile)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_applications_for_nanny(self, nanny_id: uuid.UUID) -> List[Application]:
        stmt = select(Application).where(Application.nanny_id == nanny_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def delete_nanny(self, nanny: NannyProfile):
        await self.db.delete(nanny)
        await self.db.flush()
    