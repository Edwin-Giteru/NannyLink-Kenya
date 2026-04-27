from uuid import UUID
from sqlalchemy import update, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.modules.Nanny.nanny_schema import NannyResponse
from app.modules.Match.repository import MatchRepository
from app.modules.Match.match_schema import MatchResponse
from app.utils.results import Result
from app.db.models.types import MatchStatus
from app.db.models.match import Match
import asyncio
from functools import wraps

class MatchService:
    def __init__(self, db: AsyncSession):
        self.match_repo = MatchRepository(db)

    async def initiate_connection(self, family_user_id: UUID, nanny_id: UUID) -> Result:
        """
        Initiates a connection between a family and a nanny.
        
        Uses database-level unique constraint + atomic operations
        to prevent duplicate connections being created simultaneously.
        """
        try:
            from app.modules.Family.repository import FamilyRepository
            family_repo = FamilyRepository(self.match_repo.db)
            family = await family_repo.get_family_by_user_id(family_user_id)

            if not family:
                return Result.fail("Family profile not found.", status_code=404)

            # Check existing match within a SELECT FOR UPDATE lock
            # This prevents two concurrent requests from both passing the existence check
            existing = await self.match_repo.get_existing_match_with_lock(family.id, nanny_id)
            
            if existing:
                # If match exists, return it regardless of status (idempotent operation)
                return Result.ok(data=MatchResponse.model_validate(existing), status_code=200)

            # Get current active matches count within the same transaction
            current_matches = await self.match_repo.get_matches_for_family(family.id)
            active_count = sum(1 for m in current_matches if m.status != MatchStatus.CANCELLED)

            if active_count >= 3:
                return Result.fail(
                    f"Global limit reached. You already have {active_count} active connections.",
                    status_code=400
                )

            # CRITICAL FIX: Use atomic create with uniqueness check
            # This prevents duplicate entries even if two requests pass the existence check simultaneously
            match = await self.match_repo.create_connection_atomic(family.id, nanny_id)
            
            if not match:
                # If creation returns None, a duplicate was detected
                # Fetch the existing match and return it (idempotent response)
                existing_match = await self.match_repo.get_existing_match(family.id, nanny_id)
                if existing_match:
                    return Result.ok(data=MatchResponse.model_validate(existing_match), status_code=200)
                return Result.fail("Failed to create connection due to duplicate request.", status_code=409)

            full_match = await self.match_repo.get_match_by_id(match.id)
            return Result.ok(data=MatchResponse.model_validate(full_match), status_code=201)

        except IntegrityError as e:
            # Handle database-level unique constraint violation
            await self.match_repo.db.rollback()
            # Check if it's a duplicate key violation
            if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
                # Fetch the existing match that caused the conflict
                existing_match = await self.match_repo.get_existing_match(family.id, nanny_id)
                if existing_match:
                    return Result.ok(data=MatchResponse.model_validate(existing_match), status_code=200)
            return Result.fail(f"Database error: {str(e)}", status_code=500)
        except Exception as e:
            await self.match_repo.db.rollback()
            return Result.fail(f"Internal error: {str(e)}", status_code=500)

    async def list_user_connections(self, user_id: UUID, role: str) -> Result:
        try:
            if role == "family":
                from app.modules.Family.repository import FamilyRepository
                family_repo = FamilyRepository(self.match_repo.db)
                profile = await family_repo.get_family_by_user_id(user_id)
                if not profile:
                    return Result.fail("Family profile not found", 404)

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
    
    async def get_discovery_list(self, user_id: UUID) -> Result:
        """
        Retrieves nannies not yet connected to the family AND the current active count.
        """
        try:
            from app.modules.Family.repository import FamilyRepository
            family_repo = FamilyRepository(self.match_repo.db)
            profile = await family_repo.get_family_by_user_id(user_id)
            if not profile:
                return Result.fail("Family profile not found", 404)

            unconnected = await self.match_repo.get_unconnected_nannies(profile.id)
            
            all_matches = await self.match_repo.get_matches_for_family(profile.id)
            active_count = sum(1 for m in all_matches if m.status != MatchStatus.CANCELLED)

            return Result.ok(data={
                "nannies": [NannyResponse.model_validate(n) for n in unconnected],
                "active_connection_count": active_count
            })
        except Exception as e:
            return Result.fail(str(e), 500)

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