from app.db.models.family_profile import FamilyProfile
from app.modules.Family.repository import FamilyRepository
from app.modules.Match.repository import MatchRepository
from app.utils.results import Result
from app.modules.Family.schema import FamilyCreate, FamilyUpdate, FamilyResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

class FamilyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.family_repository = FamilyRepository(db)
        self.match_repository = MatchRepository(db)

    async def create_family(self, family_create: FamilyCreate, user_id: uuid.UUID) -> Result:
        try:
            existing_family = await self.family_repository.get_family_by_user_id(user_id)
            if existing_family:
                return Result.fail(f"Family with user_id: {user_id} already exists", status_code=400)
            
            new_family = await self.family_repository.create_family(family_create, user_id)
            await self.db.commit()
            await self.db.refresh(new_family)

            return Result.ok(data=FamilyResponse.model_validate(new_family), status_code=201)
        except Exception as e:
            await self.db.rollback()
            return Result.fail(f"Family creation failed: {str(e)}", status_code=500)

    async def update_family(self, family_update: FamilyUpdate, user_id: uuid.UUID) -> Result:
        try:
            family = await self.family_repository.get_family_by_user_id(user_id)
            if not family:
                return Result.fail("Family profile not found", status_code=404)

            update_data = family_update.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if value is not None:
                    setattr(family, field, value)

            await self.db.commit()
            await self.db.refresh(family)
            return Result.ok(data=FamilyResponse.model_validate(family))
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), status_code=500)

    async def get_family(self, user_id: uuid.UUID) -> Result:
        family = await self.family_repository.get_family_by_user_id(user_id)
        if not family:
            return Result.fail("Family not found", status_code=404)
        return Result.ok(data=FamilyResponse.model_validate(family))

    async def get_family_connections(self, user_id: uuid.UUID) -> Result:
        """Fetch all nannies this family has connected with."""
        try:
            family = await self.family_repository.get_family_by_user_id(user_id)
            if not family:
                return Result.fail("Family profile not found", status_code=404)
            
            connections = await self.match_repository.get_matches_for_family(family.id)
            return Result.ok(data=connections)
        except Exception as e:
            return Result.fail(f"Error fetching connections: {str(e)}", status_code=500)