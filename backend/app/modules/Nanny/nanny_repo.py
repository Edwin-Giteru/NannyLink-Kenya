from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
import uuid

from app.db.models.nanny_profile import NannyProfile
from app.modules.Nanny.nanny_schema import NannyCreate
from sqlalchemy import select, func, or_, not_
from app.db.models.types import MatchStatus, VettingStatus
from app.db.models.match import Match

class NannyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # app/modules/Nanny/nanny_repo.py

from sqlalchemy import select, func, or_
# Ensure you have these imported at the top

class NannyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ... other methods ...

    async def get_public_nannies(
        self, 
        skip: int = 0, 
        limit: int = 6, 
        search: str | None = None, 
        location: str | None = None
    ) -> list[NannyProfile]:
        """Fetch nannies WITHOUT active connections (available for hire)."""
        
        # Subquery: nannies that have active matches
        active_match_subquery = (
            select(Match.nanny_id)
            .where(
                Match.status.in_([MatchStatus.AWAITING_PAYMENT, MatchStatus.COMPLETED])
            )
            .distinct()
            .subquery()
        )
        
        # Main query: exclude nannies with active matches
        stmt = select(NannyProfile).where(
            NannyProfile.vetting_status == VettingStatus.APPROVED,
            not_(NannyProfile.id.in_(select(active_match_subquery.c.nanny_id)))
        )

        # Filter by Location (Address)
        if location and location != "All Cities" and location != "":
            stmt = stmt.where(NannyProfile.address.ilike(f"%{location}%"))

        # Search by Name or Skills
        if search:
            stmt = stmt.where(
                or_(
                    NannyProfile.name.ilike(f"%{search}%"),
                    NannyProfile.skills.ilike(f"%{search}%")
                )
            )

        # Apply Pagination and Ordering
        stmt = stmt.order_by(NannyProfile.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def count_available_nannies(
        self, 
        search: str | None = None, 
        location: str | None = None
    ) -> int:
        """Count available nannies (without active connections)"""
        
        active_match_subquery = (
            select(Match.nanny_id)
            .where(
                Match.status.in_([MatchStatus.AWAITING_PAYMENT, MatchStatus.COMPLETED])
            )
            .distinct()
            .subquery()
        )
        
        stmt = select(func.count(NannyProfile.id)).where(
            NannyProfile.vetting_status == VettingStatus.APPROVED,
            not_(NannyProfile.id.in_(select(active_match_subquery.c.nanny_id)))
        )
        
        if location and location != "All Cities" and location != "":
            stmt = stmt.where(NannyProfile.address.ilike(f"%{location}%"))
            
        if search:
            stmt = stmt.where(
                or_(
                    NannyProfile.name.ilike(f"%{search}%"),
                    NannyProfile.skills.ilike(f"%{search}%")
                )
            )
            
        result = await self.db.execute(stmt)
        return result.scalar() or 0
    async def save(self, nanny: NannyProfile) -> NannyProfile:
        self.db.add(nanny)
        await self.db.flush()
        await self.db.refresh(nanny)
        return nanny
    
    async def create_nanny(self, nanny_create: NannyCreate, user_id: uuid.UUID) -> NannyProfile:
        new_nanny = NannyProfile(**nanny_create.model_dump(), user_id=user_id)
        return await self.save(new_nanny)
    
    async def get_nanny_by_user_id(self, user_id: uuid.UUID) -> NannyProfile | None:
        stmt = select(NannyProfile).where(NannyProfile.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_nanny_by_id(self, nanny_id: uuid.UUID, include_user: bool = False) -> NannyProfile | None:
        stmt = select(NannyProfile).where(NannyProfile.id == nanny_id)
        if include_user:
            stmt = stmt.options(selectinload(NannyProfile.user))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
       
    async def delete_nanny(self, nanny: NannyProfile):
        await self.db.delete(nanny)

    async def count_number_of_nannies(self) -> int:
        stmt = select(func.count(NannyProfile.id))
        result = await self.db.execute(stmt)
        return result.scalar() or 0