from uuid import UUID
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.Match.repository import MatchRepository
from app.modules.Match.match_schema import MatchResponse
from app.utils.results import Result
from app.db.models.types import MatchStatus
from app.db.models.match import Match

class MatchService:
    def __init__(self, db: AsyncSession):
        self.match_repo = MatchRepository(db)

    async def initiate_connection(self, family_user_id: UUID, nanny_id: UUID) -> Result:
        try:
            from app.modules.Family.repository import FamilyRepository
            family_repo = FamilyRepository(self.match_repo.db)
            family = await family_repo.get_family_by_user_id(family_user_id)

            if not family:
                return Result.fail("Family profile not found.", status_code=404)

            existing = await self.match_repo.get_existing_match(family.id, nanny_id)
            if existing:
                return Result.ok(data=MatchResponse.model_validate(existing), status_code=200)

            match = await self.match_repo.create_connection(family.id, nanny_id)
            full_match = await self.match_repo.get_match_by_id(match.id)
            return Result.ok(data=MatchResponse.model_validate(full_match), status_code=201)

        except Exception as e:
            return Result.fail(f"Connection failed: {str(e)}", status_code=500)

    async def list_user_connections(self, user_id: UUID, role: str) -> Result:
        try:
            if role == "family":
                from app.modules.Family.repository import FamilyRepository
                family_repo = FamilyRepository(self.match_repo.db)
                
                # 1. Get the ACTUAL Family Profile ID first
                profile = await family_repo.get_family_by_user_id(user_id)
                if not profile:
                    return Result.fail("Family profile not found", 404)

                # 2. Pass the profile.id (the UUID in the family_profile table)
                nannies = await self.match_repo.get_unconnected_nannies(profile.id)
                
                # Use your Nanny Schema for validation if you have one, 
                # otherwise return the raw list
                return Result.ok(data=nannies)
                
            else:
                # Logic for nannies remains as actual matches
                from app.modules.Nanny.nanny_repo import NannyRepository
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
        try:
            match = await self.match_repo.get_match_by_id(match_id)
            if not match:
                return Result.fail("Match connection not found", 404)
            return Result.ok(data=match)
        except Exception as e:
            return Result.fail(f"Error retrieving match: {str(e)}", 500)

    async def update_match_status(self, match_id: UUID, new_status: MatchStatus) -> Result:
        try:
            stmt = (
                update(Match)
                .where(Match.id == match_id)
                .values(status=new_status)
            )
            await self.match_repo.db.execute(stmt)
            await self.match_repo.db.commit()  

            return Result.ok(data={"match_id": match_id, "new_status": new_status})
        except Exception as e:
            await self.match_repo.db.rollback()  
            return Result.fail(f"Failed to update match status: {str(e)}", 500)