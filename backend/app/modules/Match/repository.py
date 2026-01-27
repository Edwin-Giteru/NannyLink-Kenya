from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from app.db.models.match import Match

class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db 

    async def save(self, match: Match) -> Match:
        self.db.add(match)
        await self.db.commit()
        await self.db.refresh(match)
        return match
    
    async  def create_match(self, job_id: UUID, nanny_id: UUID) -> Match:
        new_match = Match(
            job_id=job_id,
            selected_nanny_id=nanny_id
        )
        return await self.save(new_match)
    
    async def get_match_by_id(self, match_id: UUID) -> Match | None:
        stmt = select(Match).where(Match.id == match_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()