from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.modules.Nanny.nanny_repo import NannyRepository
from app.modules.Match.repository import MatchRepository
from app.modules.Nanny.nanny_schema import NannyCreate, NannyUpdate, NannyResponse
from app.db.models.nanny_profile import NannyProfile
from app.db.models.types import VettingStatus
from app.utils.results import Result

class NannyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.nanny_repository = NannyRepository(db)
        self.match_repository = MatchRepository(db)
    async def get_paginated_nannies(
        self, 
        skip: int, 
        limit: int, 
        search: str | None, 
        location: str | None
    ):
        return await self.nanny_repository.get_public_nannies(
            skip=skip,
            limit=limit,
            search=search,
            location=location
        )
    async def get_nanny_connections(self, user_id: uuid.UUID) -> Result:
        try:
            nanny = await self.nanny_repository.get_nanny_by_user_id(user_id)
            if not nanny:
                return Result.fail("Nanny profile not found", status_code=404)
            connections = await self.match_repository.get_matches_for_nanny(nanny.id)
            return Result.ok(data=connections)
        except Exception as e:
            return Result.fail(f"Error fetching connections: {str(e)}", status_code=500)

    async def create_nanny_profile(self, nanny_create: NannyCreate, user_id: uuid.UUID) -> Result:
        try:
            existing_profile = await self.nanny_repository.get_nanny_by_user_id(user_id)
            if existing_profile:
                return Result.fail("Nanny profile already exists for this user", status_code=400)

            new_nanny = await self.nanny_repository.create_nanny(nanny_create, user_id)

            # FIX: Always stamp vetting_status as PENDING on creation
            # This guards against the repo not setting it
            new_nanny.vetting_status = VettingStatus.PENDING

            await self.db.commit()
            await self.db.refresh(new_nanny)

            return Result.ok(data=NannyResponse.model_validate(new_nanny))
        except Exception as e:
            await self.db.rollback()
            return Result.fail(f"Could not create profile: {str(e)}", status_code=500)

    async def update_nanny_profile(self, nanny_update: NannyUpdate, user_id: uuid.UUID) -> Result:
        try:
            nanny = await self.nanny_repository.get_nanny_by_user_id(user_id)
            if not nanny:
                return Result.fail("Nanny profile not found", status_code=404)

            update_data = nanny_update.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if hasattr(nanny, field):
                    setattr(nanny, field, value)

            await self.db.commit()
            await self.db.refresh(nanny)
            return Result.ok(data=NannyResponse.model_validate(nanny))
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), status_code=500)

    async def get_full_nanny_details(self, nanny_id: uuid.UUID) -> Result:
        nanny = await self.nanny_repository.get_nanny_by_id(nanny_id, include_user=True)
        if not nanny:
            return Result.fail("Nanny not found", status_code=404)
        return Result.ok(data=nanny)

    async def get_nanny_by_user(self, user_id: uuid.UUID) -> Result:
        try:
            nanny = await self.nanny_repository.get_nanny_by_user_id(user_id)
            if not nanny:
                return Result.fail("Nanny profile not found", status_code=404)
            return Result.ok(data=NannyResponse.model_validate(nanny))
        except Exception as e:
            return Result.fail(str(e), status_code=500)