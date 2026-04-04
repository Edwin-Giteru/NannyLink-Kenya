# app/modules/Match/repository.py
from operator import not_

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from sqlalchemy import and_, func

from app.db.models.match import Match
from app.db.models.types import MatchStatus
from app.db.models.family_profile import FamilyProfile
from app.db.models.nanny_profile import NannyProfile

class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Load Profile objects directly. These profiles contain the 'full_name' or 'name' fields.
    _load_opts = [
        selectinload(Match.nanny), 
        selectinload(Match.family),
        selectinload(Match.contract),
    ]
    async def get_unconnected_nannies(self, family_id: UUID) -> list[NannyProfile]:
        """
        Returns only nannies who do NOT have a record in the Match table 
        for the given family_id.
        """
        # We join NannyProfile to Match, but only for THIS family
        stmt = (
            select(NannyProfile)
            .outerjoin(
                Match, 
                and_(
                    Match.nanny_id == NannyProfile.id, 
                    Match.family_id == family_id
                )
            )
            # Filter for rows where the JOIN failed (meaning no connection exists)
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
        stmt = (
            select(Match)
            .where(and_(Match.family_id == family_id, Match.nanny_id == nanny_id))
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

    async def create_connection(self, family_id: UUID, nanny_id: UUID) -> Match:
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