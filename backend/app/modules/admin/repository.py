import uuid

import sqlalchemy
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import not_, select, func, or_, and_, exists
from app.db.models import User, Payment, Match, FamilyProfile, NannyProfile
from sqlalchemy.orm import joinedload, selectinload
from app.db.models import User, Payment, Match, FamilyProfile, NannyProfile
from app.db.models.types import MatchStatus, UserRole, VettingStatus
from app.utils.security import hash_password
from .schema import AdminCreateUserRequest
from typing import Optional

class AdminRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_aggregated_stats(self):        # Use func.lower() to make the status check case-insensitive
        rev_stmt = select(
            func.sum(Payment.amount).label("total"),
            func.sum(Payment.amount).filter(
                func.lower(Payment.payment_status) == "completed"
            ).label("completed"),
            func.sum(Payment.amount).filter(
                func.lower(Payment.payment_status) == "pending"
            ).label("pending")
        )
        rev_res = await self.db.execute(rev_stmt)
        revenue = rev_res.one()
        user_counts = await self.db.execute(
            select(
                func.count(User.id).label("total"),
                func.count(User.id).filter(User.role == UserRole.FAMILY).label("families"),
                func.count(User.id).filter(User.role == UserRole.NANNY).label("nannies")
            )
        )
        users = user_counts.one()

        match_counts = await self.db.execute(
            select(
                func.count(Match.id).filter(Match.status == MatchStatus.AWAITING_PAYMENT).label("awaiting"),
                func.count(Match.id).filter(Match.status == MatchStatus.COMPLETED).label("completed")
            )
        )
        matches = match_counts.one()

        return {"revenue": revenue, "users": users, "matches": matches}

    async def get_recent_transactions(self, limit: int = 5):
        stmt = (
            select(
                Payment,
                func.coalesce(FamilyProfile.name, NannyProfile.name).label("display_name")
            )
            .join(User, Payment.user_id == User.id)
            .outerjoin(FamilyProfile, User.id == FamilyProfile.user_id)
            .outerjoin(NannyProfile, User.id == NannyProfile.user_id)
            .order_by(Payment.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.all()
    
    async def get_paginated_users(
        self, 
        search: str = None, 
        role: str = None, 
        status: str = None, 
        page: int = 1, 
        limit: int = 10
    ):
        query = (
            select(User)
            .options(
                selectinload(User.nanny_profile),
                selectinload(User.family_profile)
            )
            .outerjoin(NannyProfile)
            .outerjoin(FamilyProfile)
        )

        # 1. Base Role Filter
        if role and role.upper() in [r.name for r in UserRole]:
            query = query.filter(User.role == UserRole[role.upper()])
        
        # 2. Advanced Status Filter
        if status:
            internal_status = status.upper()
            if internal_status == "VETTED":
                # Show Admins/Families (always vetted) OR Nannies who are APPROVED
                query = query.filter(
                    or_(
                        User.role.in_([UserRole.ADMIN, UserRole.FAMILY]),
                        NannyProfile.vetting_status == VettingStatus.APPROVED
                    )
                )
            elif internal_status == "PENDING":
                # ONLY Nannies can be pending. 
                # If the user filter is set to "PENDING", automatically restrict to nannies
                query = query.filter(
                    User.role == UserRole.NANNY,
                    NannyProfile.vetting_status == VettingStatus.PENDING
                )

        # 3. Search logic
        if search:
            search_filter = or_(
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
                NannyProfile.name.ilike(f"%{search}%"),
                FamilyProfile.name.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        # 4. Count and Paginate
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total_count = total_result.scalar() or 0

        query = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        
        return total_count, result.scalars().all()
    
    async def update_nanny_vetting_status(self, user_id: str, status: VettingStatus) -> bool:
        """
        Updates the vetting status of a nanny profile linked to the user_id.
        """
        stmt = (
            select(NannyProfile)
            .where(NannyProfile.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        nanny_profile = result.scalar_one_or_none()

        if not nanny_profile:
            return False

        nanny_profile.vetting_status = status
        # In SQLAlchemy with AsyncSession, changes to objects are tracked.
        # We just need to commit in the service layer or here.
        await self.db.flush() 
        return True
    
    async def create_user_with_profile(self, user_data: AdminCreateUserRequest) -> User:
        """
        Creates a User and their respective Profile (Nanny/Family) atomically.
        """
        # 1. Initialize the User
        new_user = User(
            email=user_data.email,
            phone=user_data.phone,
            password=hash_password(user_data.password),
            role=user_data.role
        )
        self.db.add(new_user)
        await self.db.flush() # Flush to generate user.id

        # 2. Initialize the Profile based on Role
        if user_data.role == UserRole.NANNY:
            profile = NannyProfile(
                user_id=new_user.id,
                name=user_data.name,
                vetting_status=VettingStatus.PENDING # Default for new nannies
            )
            self.db.add(profile)
        
        elif user_data.role == UserRole.FAMILY:
            profile = FamilyProfile(
                user_id=new_user.id,
                name=user_data.name
            )
            self.db.add(profile)

        await self.db.flush()
        return new_user

    async def get_user_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def delete(self, user: User) -> bool:
        try:
            self.db.delete(user)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            raise

    
    async def get_paginated_matches(
        self, 
        search: str = None, 
        status: str = None, 
        page: int = 1, 
        limit: int = 10
    ):
        query = (
            select(Match)
            .options(
                joinedload(Match.family),
                joinedload(Match.nanny)
            )
        )

        if status:
            query = query.filter(Match.status == MatchStatus[status.upper()])

        if search:
            # Search by Match ID (UUID string) or Nanny/Family names
            search_filter = or_(
                func.cast(Match.id, sqlalchemy.String).ilike(f"%{search}%"),
                NannyProfile.name.ilike(f"%{search}%"),
                FamilyProfile.name.ilike(f"%{search}%")
            )
            query = query.join(Match.nanny).join(Match.family).filter(search_filter)

        # Totals for the UI header
        total_count_stmt = select(func.count(Match.id))
        active_count_stmt = select(func.count(Match.id)).where(Match.status == MatchStatus.COMPLETED)
        
        total_res = await self.db.execute(total_count_stmt)
        active_res = await self.db.execute(active_count_stmt)
        
        total_count = total_res.scalar() or 0
        active_count = active_res.scalar() or 0

        # Pagination
        query = query.order_by(Match.created_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        
        return total_count, active_count, result.scalars().all()

    async def update_match_status(self, match_id: uuid.UUID, new_status: MatchStatus) -> Match | None:
        stmt = select(Match).where(Match.id == match_id)
        result = await self.db.execute(stmt)
        match_obj = result.scalar_one_or_none()
        
        if not match_obj:
            return None
            
        match_obj.status = new_status
        await self.db.flush() 
        return match_obj

    # Inside AdminRepository class
    async def get_active_match_between(self, family_id: uuid.UUID, nanny_id: uuid.UUID):
        """Safety check to ensure we don't double-match."""
        stmt = select(Match).where(
            and_(
                Match.family_id == family_id,
                Match.nanny_id == nanny_id,
                Match.status != MatchStatus.CANCELLED
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_eligible_families(self):
        """Find families without an active/pending match."""
        # Subquery for families already in a 'valid' match
        active_exists = exists().where(
            and_(
                Match.family_id == FamilyProfile.id,
                Match.status.in_([MatchStatus.AWAITING_PAYMENT, MatchStatus.COMPLETED])
            )
        )
        stmt = select(FamilyProfile).where(not_(active_exists))
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_eligible_nannies(self):
        """Find nannies without an active/pending match."""
        active_exists = exists().where(
            and_(
                Match.nanny_id == NannyProfile.id,
                Match.status.in_([MatchStatus.AWAITING_PAYMENT, MatchStatus.COMPLETED])
            )
        )
        stmt = select(NannyProfile).where(not_(active_exists))
        res = await self.db.execute(stmt)
        return res.scalars().all()


    async def get_admin_payments(
        self, 
        skip: int = 0, 
        limit: int = 10, 
        status: str = None, 
        search: str = None
    ):
        # Use joinedload to pull in matches and their specific profiles in one go
        query = select(Payment).options(
            joinedload(Payment.matches).joinedload(Match.family),
            joinedload(Payment.matches).joinedload(Match.nanny)
        )
        
        if status:
            query = query.filter(Payment.payment_status == status)
        
        if search:
            # Improved search to look through M-Pesa codes or even status
            query = query.filter(
                or_(
                    Payment.checkout_request_id.ilike(f"%{search}%"),
                    Payment.mpesa_transaction_code.ilike(f"%{search}%")
                )
            )
        
        # Get total count
        count_query = select(func.count()).select_from(Payment)
        if status: count_query = count_query.filter(Payment.payment_status == status)
        # Add search filter to count if search exists
        
        result_count = await self.db.execute(count_query)
        total_count = result_count.scalar()
        
        # Execute main query
        result_list = await self.db.execute(
            query.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
        )
        
        # unique() is critical when using joinedload on a collection (matches)
        results = result_list.unique().scalars().all()
        
        return results, total_count
    
    async def get_payment_stats(self):
            # 1. Total Volume: Sum of all 'completed' payments in M-Pesa logs
            res_vol = await self.db.execute(
            select(func.sum(Payment.amount)).filter(
                func.lower(Payment.payment_status) == "completed"
                )
            )
            total_vol = res_vol.scalar() or 0
            
            # 2. Total Business Attempts: This should be the total number of Matches created
            # because every match represents a payment intent.
            res_matches = await self.db.execute(select(func.count(Match.id)))
            total_business_attempts = res_matches.scalar() or 0
            
            # 3. Successful Placements: Matches that are actually COMPLETED
            res_success = await self.db.execute(
                select(func.count(Match.id)).filter(Match.status == MatchStatus.COMPLETED)
            )
            successful_placements = res_success.scalar() or 0
            
            # 4. Success Rate: Successful Matches / Total Matches
            success_rate = (successful_placements / total_business_attempts * 100) if total_business_attempts > 0 else 0
            
            return {
                "total_volume": total_vol,
                "success_rate": round(success_rate, 1),
                "total_count": total_business_attempts  # This will now show 7 if you have 7 matches
            }
