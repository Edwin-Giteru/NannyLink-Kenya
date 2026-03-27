from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
import uuid

from app.db.models.nanny_profile import NannyProfile
from app.modules.Nanny.nanny_schema import NannyCreate

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
    
    async def get_nanny_by_id(self, nanny_id: uuid.UUID, include_user: bool = False) -> NannyProfile | None:
        stmt = select(NannyProfile).where(NannyProfile.id == nanny_id)
        if include_user:
            stmt = stmt.options(selectinload(NannyProfile.user))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_public_nannies(self) -> list[NannyProfile]:
        # Only get nannies that are vetted (optional logic you can add here)
        stmt = select(NannyProfile).order_by(NannyProfile.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def delete_nanny(self, nanny: NannyProfile):
        await self.db.delete(nanny)