from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.modules.Nanny.nanny_repo import NannyRepository
from app.modules.Match.repository import MatchRepository
from app.modules.Nanny.nanny_schema import NannyCreate, NannyUpdate, NannyResponse
from app.db.models.nanny_profile import NannyProfile
from app.utils.results import Result

class NannyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.nanny_repository = NannyRepository(db)
        self.match_repository = MatchRepository(db)

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
            # 1. Check if the user already has a profile
            existing_profile = await self.nanny_repository.get_nanny_by_user_id(user_id)
            if existing_profile:
                return Result.fail("Nanny profile already exists for this user", status_code=400)

            # 2. Create the profile
            # We pass user_id explicitly to link the profile to the logged-in account
            new_nanny = await self.nanny_repository.create_nanny(nanny_create, user_id)
            
            # 3. Commit the transaction
            await self.db.commit()
            
            return Result.ok(data=NannyResponse.model_validate(new_nanny))
        except Exception as e:
            await self.db.rollback()
            return Result.fail(f"Could not create profile: {str(e)}", status_code=500)

    async def update_nanny_profile(self, nanny_update: NannyUpdate, user_id: uuid.UUID) -> Result:
        try:
            # 1. Fetch the existing profile
            nanny = await self.nanny_repository.get_nanny_by_user_id(user_id)
            if not nanny:
                return Result.fail("Nanny profile not found", status_code=404)

            # 2. Extract update data
            # CRITICAL: Ensure your NannyUpdate schema actually has profile_photo_url: str | None = None
            update_data = nanny_update.model_dump(exclude_unset=True)

            # 3. Apply all fields to the database object
            for field, value in update_data.items():
                if hasattr(nanny, field):
                    setattr(nanny, field, value)

            # 4. Commit and Refresh
            await self.db.commit()
            await self.db.refresh(nanny)
            
            return Result.ok(data=NannyResponse.model_validate(nanny))
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), status_code=500)

    async def get_full_nanny_details(self, nanny_id: uuid.UUID) -> Result:
        """Fetch nanny with user/account details for protected views."""
        nanny = await self.nanny_repository.get_nanny_by_id(nanny_id, include_user=True)
        if not nanny:
            return Result.fail("Nanny not found", status_code=404)
        return Result.ok(data=nanny)
    
    async def get_nanny_by_user(self, user_id: uuid.UUID) -> Result:
        """Fetch profile using the User's ID instead of the Profile ID."""
        try:
            nanny = await self.nanny_repository.get_nanny_by_user_id(user_id)
            if not nanny:
                return Result.fail("Nanny profile not found", status_code=404)
            
            return Result.ok(data=NannyResponse.model_validate(nanny))
        except Exception as e:
            return Result.fail(str(e), status_code=500)