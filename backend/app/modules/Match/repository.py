from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.db.models.match import Match
from app.db.models.nanny_profile import NannyProfile
from app.db.models.family_profile import FamilyProfile
from app.db.models.job_post import JobPost


class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── helpers ──────────────────────────────────────────────
    _load_opts = [
        selectinload(Match.job_post),
        selectinload(Match.family),
        selectinload(Match.selected_nanny),
    ]

    async def save(self, match: Match) -> Match:
        self.db.add(match)
        await self.db.commit()
        await self.db.refresh(match)
        return match

    async def create_match(
        self, job_id: UUID, nanny_id: UUID, family_id: UUID
    ) -> Match:
        new_match = Match(
            job_id=job_id,
            selected_nanny_id=nanny_id,
            family_id=family_id,
        )
        return await self.save(new_match)

    async def get_match_by_id(self, match_id: UUID) -> Match | None:
        stmt = (
            select(Match)
            .where(Match.id == match_id)
            .options(*self._load_opts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_matches_by_user_id(self, user_id: UUID) -> list[Match]:
        """
        Returns all matches for the nanny whose NannyProfile.user_id == user_id.
        Steps:
          1. Look up the NannyProfile row for this user.
          2. Query Match rows where selected_nanny_id == nanny_profile.id.
        """
        # Step 1 – get the nanny profile id
        nanny_stmt = select(NannyProfile).where(NannyProfile.user_id == user_id)
        nanny_result = await self.db.execute(nanny_stmt)
        nanny = nanny_result.scalar_one_or_none()

        if not nanny:
            return []

        # Step 2 – get all matches for that nanny, eager-loading relations
        match_stmt = (
            select(Match)
            .where(Match.selected_nanny_id == nanny.id)
            .options(*self._load_opts)
            .order_by(Match.created_at.desc())
        )
        result = await self.db.execute(match_stmt)
        return list(result.scalars().all())

    async def get_matches_by_family_id(self, family_id: UUID) -> list[Match]:
        """
        Returns all matches where Match.family_id == family_id.
        job_post and family relations are eagerly loaded.
        """
        stmt = (
            select(Match)
            .where(Match.family_id == family_id)
            .options(*self._load_opts)
            .order_by(Match.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    