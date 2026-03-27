from app.db.models.family_profile import FamilyProfile
from app.db.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.modules.Family.schema import FamilyCreate
import uuid
from sqlalchemy import func

class FamilyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, family: FamilyProfile) -> FamilyProfile:
        self.db.add(family)
        await self.db.flush()
        await self.db.refresh(family)
        return family
    
    async def create_family(self, family_create: FamilyCreate, user_id: uuid.UUID) -> FamilyProfile:
        new_family = FamilyProfile(**family_create.model_dump(), user_id=user_id)
        return await self.save(new_family)
    
    async def get_family_by_user_id(self, user_id: uuid.UUID) -> FamilyProfile | None:
        stmt = select(FamilyProfile).where(FamilyProfile.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_family_by_id(self, family_id: uuid.UUID) -> FamilyProfile | None:
        stmt = select(FamilyProfile).where(FamilyProfile.id == family_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_user_id_by_family_id(self, family_id: uuid.UUID) -> User | None:
        stmt = select(User).join(FamilyProfile, User.id == FamilyProfile.user_id).where(FamilyProfile.id == family_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def count_number_of_families(self) -> int:
        stmt = select(func.count(FamilyProfile.id))
        result = await self.db.execute(stmt)
        return result.scalar_one()