from app.db.models.family_profile import FamilyProfile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.modules.Family.schema import FamilyCreate
import uuid


class FamilyRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, family: FamilyProfile) -> FamilyProfile:
        self.db.add(family)
        await self.db.flush()
        await self.db.refresh(family)
        return family
    
    async def create_family(self, family: FamilyCreate, user_id: uuid.UUID) -> FamilyProfile:
        new_family = FamilyProfile(**family.model_dump(), user_id=user_id)
        return await self.save(new_family)
    
    async def get_family_by_user_id(self, user_id: uuid.UUID) -> FamilyProfile:
        stmt = select(FamilyProfile).where(FamilyProfile.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_family_by_id(self, family_id: uuid.UUID) -> FamilyProfile:
        stmt = select(FamilyProfile).where(FamilyProfile.id == family_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    