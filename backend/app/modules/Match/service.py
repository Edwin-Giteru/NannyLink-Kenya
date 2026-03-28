from uuid import UUID
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.Match.repository import MatchRepository
from app.modules.Match.match_schema import MatchResponse # Assume this is updated to match new fields
from app.utils.results import Result
from app.db.models.types import MatchStatus
from app.db.models.match import Match

class MatchService:
    def __init__(self, db: AsyncSession):
        self.match_repo = MatchRepository(db)

    async def initiate_connection(self, family_user_id: UUID, nanny_id: UUID) -> Result:
        try:
            # 1. Get Family Profile from User ID
            from app.modules.Family.repository import FamilyRepository
            family_repo = FamilyRepository(self.match_repo.db)
            family = await family_repo.get_family_by_user_id(family_user_id)
            
            if not family:
                return Result.fail("Family profile not found.", status_code=404)

            # 2. Check for duplicate connection
            existing = await self.match_repo.get_existing_match(family.id, nanny_id)
            if existing:
                return Result.ok(data=MatchResponse.model_validate(existing), status_code=200)

            # 3. Create Connection
            match = await self.match_repo.create_connection(family.id, nanny_id)
            # Re-load for relationships
            full_match = await self.match_repo.get_match_by_id(match.id)
            return Result.ok(data=MatchResponse.model_validate(full_match), status_code=201)

        except Exception as e:
            return Result.fail(f"Connection failed: {str(e)}", status_code=500)

    async def list_user_connections(self, user_id: UUID, role: str) -> Result:
        try:
            if role == "family":
                from app.modules.Family.repository import FamilyRepository
                family_repo = FamilyRepository(self.match_repo.db)
                profile = await family_repo.get_family_by_user_id(user_id)
                matches = await self.match_repo.get_matches_for_family(profile.id)
            else:
                from app.modules.Nanny.nanny_repo import NannyRepository # Assume standard NannyRepo
                nanny_repo = NannyRepository(self.match_repo.db)
                profile = await nanny_repo.get_nanny_by_user_id(user_id)
                matches = await self.match_repo.get_matches_for_nanny(profile.id)

            return Result.ok(data=[MatchResponse.model_validate(m) for m in matches])
        except Exception as e:
            return Result.fail(str(e), status_code=500)

    async def get_connection_details(self, match_id: UUID) -> Result:
        match = await self.match_repo.get_match_by_id(match_id)
        if not match:
            return Result.fail("Connection not found.", status_code=404)
        return Result.ok(data=MatchResponse.model_validate(match))
    
    async def get_match_by_id(self, match_id: UUID) -> Result:
        """Fetches a single match record by its UUID."""
        try:
            # Replace 'Match' with your actual model name
            from app.db.models.match import Match 
            from sqlalchemy import select

            stmt = select(Match).where(Match.id == match_id)
            result = await self.db.execute(stmt)
            match = result.scalar_one_or_none()

            if not match:
                return Result.fail("Match connection not found", 404)
            
            return Result.ok(data=match)
        except Exception as e:
            # Use your logger here if you have one
            return Result.fail(f"Error retrieving match: {str(e)}", 500)
        
    async def update_match_status(self, match_id: UUID, new_status: MatchStatus) -> Result:
        """Updates the status of a specific match/connection."""
        try:
            # We use an update statement for efficiency
            stmt = (
                update(Match)
                .where(Match.id == match_id)
                .values(status=new_status)
            )
            await self.db.execute(stmt)
            # We don't commit here because the PaymentService 
            # will call db.commit() after processing everything.
            
            return Result.ok(data={"match_id": match_id, "new_status": new_status})
        except Exception as e:
            return Result.fail(f"Failed to update match status: {str(e)}", 500)