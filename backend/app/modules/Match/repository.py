from operator import not_
from sqlalchemy import select, update, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app.db.models.match import Match
from app.db.models.types import MatchStatus
from app.db.models.family_profile import FamilyProfile
from app.db.models.nanny_profile import NannyProfile

class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    _load_opts = [
        selectinload(Match.nanny), 
        selectinload(Match.family),
        selectinload(Match.contract),
    ]
    
    async def get_unconnected_nannies(self, family_id: UUID) -> list[NannyProfile]:
        """
        Returns nannies who do NOT have any connection with any family at all.
        """
        stmt = (
            select(NannyProfile)
            .outerjoin(Match, NannyProfile.id == Match.nanny_id)
            .where(Match.id == None)
            .order_by(NannyProfile.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_match_by_id(self, match_id: UUID) -> Match | None:
        stmt = select(Match).where(Match.id == match_id).options(*self._load_opts)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_existing_match(self, family_id: UUID, nanny_id: UUID) -> Match | None:
        """Simple existence check without locks"""
        stmt = (
            select(Match)
            .where(and_(Match.family_id == family_id, Match.nanny_id == nanny_id))
            .options(*self._load_opts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_existing_match_with_lock(self, family_id: UUID, nanny_id: UUID) -> Match | None:
        """
        Use SELECT ... FOR UPDATE to lock the row.
        This prevents concurrent transactions from reading stale data.
        """
        # Use WITH FOR UPDATE to lock the potential row
        stmt = (
            select(Match)
            .where(and_(Match.family_id == family_id, Match.nanny_id == nanny_id))
            .with_for_update()  
            .options(*self._load_opts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_matches_for_family(self, family_id: UUID) -> list[Match]:
        stmt = (
            select(Match)
            .where(Match.family_id == family_id)
            .options(*self._load_opts)
            .order_by(Match.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_matches_for_nanny(self, nanny_id: UUID) -> list[Match]:
        stmt = (
            select(Match)
            .where(Match.nanny_id == nanny_id)
            .options(*self._load_opts)
            .order_by(Match.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_connection_atomic(self, family_id: UUID, nanny_id: UUID) -> Match | None:
        """
        Atomic insert with ON CONFLICT handling.
        Uses the database's unique constraint to prevent duplicates.
        
        Returns:
            Match: If created successfully
            None: If a duplicate exists (caller should fetch existing)
        """
        try:
            # Try to insert the new match
            new_match = Match(
                family_id=family_id,
                nanny_id=nanny_id,
                status=MatchStatus.AWAITING_PAYMENT
            )
            self.db.add(new_match)
            await self.db.flush()  
            
            # If we get here, insert was successful
            await self.db.commit()
            return await self.get_match_by_id(new_match.id)
            
        except IntegrityError as e:
            # This is a database-level unique constraint violation
            await self.db.rollback()
            # Check if it's the unique constraint we care about
            if "uix_family_nanny_match" in str(e):
                # Duplicate detected - return None so caller can fetch existing
                return None
            raise e

    async def create_connection(self, family_id: UUID, nanny_id: UUID) -> Match:
        """
        Legacy method - kept for backward compatibility.
        Use create_connection_atomic for race-condition-safe operations.
        """
        new_match = Match(
            family_id=family_id,
            nanny_id=nanny_id,
            status=MatchStatus.AWAITING_PAYMENT
        )
        self.db.add(new_match)
        await self.db.commit()
        return await self.get_match_by_id(new_match.id)
    
    async def count_matches(self) -> int:
        stmt = select(func.count(Match.id))
        result = await self.db.execute(stmt)
        return result.scalar() or 0