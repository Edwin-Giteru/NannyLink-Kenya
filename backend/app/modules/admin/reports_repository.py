"""
Repository layer for reports data fetching with optimized queries.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.db.models import User, Payment, Match, FamilyProfile, NannyProfile
from app.db.models.types import MatchStatus, UserRole, VettingStatus


class ReportsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_filtered_matches(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None
    ) -> List[Match]:
        """
        Fetch matches with date range and status filters.
        Eager loads family and nanny profiles to avoid N+1 queries.
        """
        query = (
            select(Match)
            .options(
                joinedload(Match.family),
                joinedload(Match.nanny)
            )
        )
        
        # Apply date range filter
        if start_date:
            query = query.filter(Match.created_at >= start_date)
        if end_date:
            query = query.filter(Match.created_at <= end_date)
        
        # Apply status filter
        if status and status.strip() != "":
            try:
                status_enum = MatchStatus(status.lower())
                query = query.filter(Match.status == status_enum)
            except ValueError:
                # Invalid status value, ignore filter
                pass
        
        query = query.order_by(Match.created_at.desc())
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def get_filtered_users(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        role: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[User]:
        """
        Fetch users with date range, role, and vetting status filters.
        Eager loads profiles for efficient access.
        """
        query = (
            select(User)
            .options(
                selectinload(User.nanny_profile),
                selectinload(User.family_profile)
            )
        )
        
        # Apply date range filter
        if start_date:
            query = query.filter(User.created_at >= start_date)
        if end_date:
            query = query.filter(User.created_at <= end_date)
        
        # Apply role filter
        if role and role.strip() != "":
            try:
                role_enum = UserRole(role.lower())
                query = query.filter(User.role == role_enum)
            except ValueError:
                pass
        
        # Apply vetting status filter
        if status and status.strip() != "":
            status_lower = status.lower()
            if status_lower == "vetted":
                query = query.filter(
                    or_(
                        User.role == UserRole.FAMILY,
                        User.role == UserRole.ADMIN,
                        and_(
                            User.role == UserRole.NANNY,
                            NannyProfile.vetting_status == VettingStatus.APPROVED
                        )
                    )
                )
            elif status_lower == "pending":
                query = query.filter(
                    User.role == UserRole.NANNY,
                    NannyProfile.vetting_status == VettingStatus.PENDING
                )
        
        query = query.order_by(User.created_at.desc())
        result = await self.db.execute(query)
        return result.unique().scalars().all()

    async def get_filtered_payments(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None
    ) -> List[Payment]:
        """
        Fetch payments with date range and status filters.
        Eager loads matches and associated profiles.
        
        NOTE: Database stores payment_status in UPPERCASE: "COMPLETED", "PENDING", "FAILED"
        The status parameter from frontend comes in lowercase: "completed", "pending", "failed"
        We convert to UPPERCASE to match database values.
        """
        query = (
            select(Payment)
            .options(
                joinedload(Payment.matches)
                .joinedload(Match.family),
                joinedload(Payment.matches)
                .joinedload(Match.nanny)
            )
        )
        
        # Apply date range filter
        if start_date:
            query = query.filter(Payment.created_at >= start_date)
        if end_date:
            query = query.filter(Payment.created_at <= end_date)
        
        # Apply status filter - Convert to UPPERCASE to match database values
        if status and status.strip() != "":
            status_upper = status.upper()
            query = query.filter(Payment.payment_status == status_upper)
        
        query = query.order_by(Payment.created_at.desc())
        result = await self.db.execute(query)
        return result.unique().scalars().all()