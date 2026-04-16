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

            current_matches = await self.match_repo.get_matches_for_family(family.id)
            active_count = sum(1 for m in current_matches if m.status != MatchStatus.CANCELLED)

            if active_count >= 3:
                return Result.fail(
                    f"Global limit reached. You already have {active_count} active connections.",
                    status_code=400
                )

            match = await self.match_repo.create_connection(family.id, nanny_id)
            full_match = await self.match_repo.get_match_by_id(match.id)
            return Result.ok(data=MatchResponse.model_validate(full_match), status_code=201)

        except Exception as e:
            return Result.fail(f"Internal error: {str(e)}", status_code=500)

    async def list_user_connections(self, user_id: UUID, role: str) -> Result:
        try:
            if role == "family":
                from app.modules.Family.repository import FamilyRepository
                family_repo = FamilyRepository(self.match_repo.db)
                profile = await family_repo.get_family_by_user_id(user_id)
                if not profile:
                    return Result.fail("Family profile not found", 404)

                # ✅ FIX: Return actual Match objects so the frontend gets real match IDs
                matches = await self.match_repo.get_matches_for_family(profile.id)
                active_matches = [m for m in matches if m.status != MatchStatus.CANCELLED]

                return Result.ok(data={
                    "nannies": [MatchResponse.model_validate(m) for m in active_matches],
                    "active_connection_count": len(active_matches)
                })
            else:
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