from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from sqlalchemy import func, and_

from app.db.models.match import Match
from app.db.models.nanny_profile import NannyProfile
from app.db.models.types import MatchStatus

class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    _load_opts = [
        selectinload(Match.nanny),
        selectinload(Match.family),
        selectinload(Match.contract),
    ]

    async def create_connection(self, family_id: UUID, nanny_id: UUID) -> Match:
        new_match = Match(
            family_id=family_id,
            nanny_id=nanny_id,
            status=MatchStatus.AWAITING_PAYMENT
        )
        self.db.add(new_match)
        await self.db.commit()
        await self.db.refresh(new_match)
        return new_match

    async def get_match_by_id(self, match_id: UUID) -> Match | None:
        stmt = select(Match).where(Match.id == match_id).options(*self._load_opts)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_existing_match(self, family_id: UUID, nanny_id: UUID) -> Match | None:
        """Prevents duplicate active connections."""
        stmt = select(Match).where(
            and_(Match.family_id == family_id, Match.nanny_id == nanny_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_matches_for_family(self, family_id: UUID) -> list[Match]:
        stmt = select(Match).where(Match.family_id == family_id).options(*self._load_opts).order_by(Match.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_matches_for_nanny(self, nanny_id: UUID) -> list[Match]:
        stmt = select(Match).where(Match.nanny_id == nanny_id).options(*self._load_opts).order_by(Match.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def update_match_status(self, match_id: UUID, status: MatchStatus) -> Match:
        match = await self.get_match_by_id(match_id)
        if match:
            match.status = status
            await self.db.commit()
            await self.db.refresh(match)
        return match