import logging
import uuid
from app.db.models import User, NannyProfile, FamilyProfile, Match
from app.db.models.types import UserRole, VettingStatus, MatchStatus
from app.utils.results import Result
from app.modules.admin.repository import AdminRepository
from app.modules.admin.schema import DashboardStatsSchema, AdminCreateUserRequest
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.types import VettingStatus, UserRole
from http import HTTPStatus
from sqlalchemy.orm import selectinload
from sqlalchemy import select

import uuid
class AdminService:
    def __init__(self, db: AsyncSession):
        self.repository = AdminRepository(db)

    async def get_dashboard_overview(self) -> Result:
        raw_data = await self.repository.get_aggregated_stats()
        
        # Use the counts from the match summary
        # completed = placements done, awaiting = matches stuck at payment
        total_intent = (raw_data["matches"].completed + raw_data["matches"].awaiting) or 0
        
        # Success rate is based on placements completed vs total matches started
        success_rate = (raw_data["matches"].completed / total_intent * 100) if total_intent > 0 else 0

        stats = DashboardStatsSchema(
            total_revenue=float(raw_data["revenue"].total or 0.0),
            completed_revenue=float(raw_data["revenue"].completed or 0.0),
            pending_revenue=float(raw_data["revenue"].pending or 0.0),
            revenue_growth_percentage=12.4, # Mock growth
            total_users=raw_data["users"].total,
            total_families=raw_data["users"].families,
            total_nannies=raw_data["users"].nannies,
            awaiting_payment_matches=raw_data["matches"].awaiting,
            completed_placements=raw_data["matches"].completed,
            match_success_rate=round(success_rate, 1),
            mpesa_success_rate=99.8 
        )
        return Result.ok(data=stats)

    async def get_recent_transactions(self) -> Result:
        raw_transactions = await self.repository.get_recent_transactions()
        transactions = []
        for payment, display_name in raw_transactions:
            transactions.append({
                "transaction_id": payment.mpesa_transaction_code or "PENDING",
                "user_name": display_name or "Unknown User",
                "amount": payment.amount,
                "status": payment.payment_status,
                "created_at": payment.created_at,
                "user_avatar": None
            })
        return Result.ok(data=transactions)
    
    async def get_users_managed(self, **kwargs) -> Result:
        total_count, users = await self.repository.get_paginated_users(**kwargs)
        
        user_list = []
        for user in users:
            name = "N/A"
            photo = f"https://ui-avatars.com/api/?name={user.email}&background=random"
            
            # Default status from the database enum
            v_status = VettingStatus.PENDING

            if user.role == UserRole.NANNY and user.nanny_profile:
                name = user.nanny_profile.name
                photo = user.nanny_profile.profile_photo_url or photo
                v_status = user.nanny_profile.vetting_status
            
            elif user.role == UserRole.FAMILY:
                name = user.family_profile.name if user.family_profile else "Family Member"
                # Return the actual Enum member, not a string like "VETTED"
                v_status = VettingStatus.APPROVED 

            user_list.append({
                "id": user.id,
                "name": name,
                "email": user.email,
                "phone": user.phone or "No Phone",
                "role": user.role,  # Send the Enum member directly
                "vetting_status": v_status,  # Send the Enum member directly
                "profile_photo_url": photo,
                "created_at": user.created_at
            })

        return Result.ok(data={"total_count": total_count, "users": user_list})
    
    async def approve_nanny(self, user_id: str) -> Result:
        """
        Business logic to approve a nanny.
        """
        try:
            success = await self.repository.update_nanny_vetting_status(
                user_id=user_id, 
                status=VettingStatus.APPROVED
            )
            
            if not success:
                return Result.fail("Nanny profile not found for this user.")

            await self.repository.db.commit()
            return Result.ok(message="Nanny verified successfully.")
            
        except Exception as e:
            await self.repository.db.rollback()
            return Result.fail(f"Verification failed: {str(e)}")
        
        # app/modules/admin/service.py

    async def approve_nanny(self, user_id: str) -> Result:
        """
        Business logic to approve a nanny.
        """
        try:
            success = await self.repository.update_nanny_vetting_status(
                user_id=user_id, 
                status=VettingStatus.APPROVED
            )
            
            if not success:
                # This aligns with Result.fail(error="...")
                return Result.fail("Nanny profile not found for this user.")

            await self.repository.db.commit()
            
            # FIX: Use 'data' instead of 'message'
            return Result.ok(data="Nanny verified successfully.")
            
        except Exception as e:
            await self.repository.db.rollback()
            return Result.fail(f"Verification failed: {str(e)}")
        
    async def create_new_user(self, user_data: AdminCreateUserRequest) -> Result:
        """
        Business logic for admin-created users.
        """
        try:
            # Check for existing email
            existing = await self.repository.get_user_by_email(user_data.email)
            if existing:
                return Result.fail("A user with this email already exists.")

            # Create User + Profile
            user = await self.repository.create_user_with_profile(user_data)
            
            # Commit the full transaction
            await self.repository.db.commit()
            
            return Result.ok(data={
                "id": str(user.id),
                "role": user.role,
                "detail": f"Successfully created {user.role.value} account for {user_data.name}"
            })

        except Exception as e:
            await self.repository.db.rollback()
            return Result.fail(f"Failed to create user: {str(e)}")
        
    import logging

    # Inside AdminService class in app/modules/admin/service.py
    
    async def delete_user_account(self, user_id: str, current_admin_id: uuid.UUID) -> Result:
        try:
            target_uuid = uuid.UUID(user_id)
            
            if target_uuid == current_admin_id:
                return Result.fail(
                    error="Security violation: Admins cannot delete their own accounts.",
                    status_code=HTTPStatus.FORBIDDEN
                )

            # 1. Fetch User with RELATIONS PRE-LOADED (Eager Loading)
            # This prevents the 'greenlet_spawn' error when accessing .nanny_profile or .matches
            stmt = (
                select(User)
                .options(
                    selectinload(User.nanny_profile).selectinload(NannyProfile.matches),
                    selectinload(User.family_profile).selectinload(FamilyProfile.matches)
                )
                .filter(User.id == target_uuid)
            )
            
            result = await self.repository.db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return Result.fail(error="User not found.", status_code=HTTPStatus.NOT_FOUND)

            # 2. Cleanup Matches (Now safely in memory)
            if user.nanny_profile and user.nanny_profile.matches:
                for match in user.nanny_profile.matches:
                    await self.repository.db.delete(match)
            
            if user.family_profile and user.family_profile.matches:
                for match in user.family_profile.matches:
                    await self.repository.db.delete(match)

            # 3. Final Deletion
            await self.repository.db.delete(user)
            await self.repository.db.commit() 
            
            return Result.ok(data={"message": "User and all associated data purged."})

        except Exception as e:
            await self.repository.db.rollback()
            logging.error(f"PURGE ERROR: {str(e)}")
            return Result.fail(
                error="Internal error during purge.",
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR
            )
    
    async def get_matches_managed(self, **kwargs) -> Result:
        total, active, matches = await self.repository.get_paginated_matches(**kwargs)
        
        match_list = []
        for m in matches:
            # Generate a "Match Code" like the UI #MLK-XXXXX
            short_id = str(m.id).split('-')[0].upper()
            
            match_list.append({
                "id": m.id,
                "match_code": f"#MLK-{short_id}",
                "nanny": {
                    "name": m.nanny.name,
                    "id_code": f"ID-{str(m.nanny_id)[:5]}"
                },
                "family": {
                    "name": m.family.name,
                    "location": m.family.household_location, # Or fetch from family profile address
                    "avatar_url": f"https://ui-avatars.com/api/?name={m.family.name.replace(' ', '+')}"
                },
                "status": m.status,
                "match_date": m.match_date
            })

        return Result.ok(data={
            "total_count": total,
            "active_count": active,
            "matches": match_list
        })

    async def force_complete_match(self, match_id: str) -> Result:
        match_uuid = uuid.UUID(match_id)
        # 'updated_match' is now the Match object or None
        updated_match = await self.repository.update_match_status(match_uuid, MatchStatus.COMPLETED)
        
        if not updated_match:
            return Result.fail(error="Match not found", status_code=404)
            
        await self.repository.db.commit()
        # Now you can refresh the actual object
        await self.repository.db.refresh(updated_match)

        return Result.ok(data={"message": "Match successfully activated."})
    
    # Inside AdminService class
    async def get_manual_match_candidates(self) -> Result:
        """Fetches families and nannies who are eligible for matching."""
        families = await self.repository.get_eligible_families()
        nannies = await self.repository.get_eligible_nannies()
        
        return Result.ok(data={
            "families": [{"id": f.id, "name": f.name} for f in families],
            "nannies": [{"id": n.id, "name": n.name} for n in nannies]
        })

    async def create_manual_match(self, family_id: uuid.UUID, nanny_id: uuid.UUID) -> Result:
        """Creates a new match record after a safety check."""
        try:
            existing = await self.repository.get_active_match_between(family_id, nanny_id)
            
            if existing:
                return Result.fail("An active connection already exists for these participants.")

            new_match = Match(
                family_id=family_id,
                nanny_id=nanny_id,
                status=MatchStatus.AWAITING_PAYMENT
            )
            
            self.repository.db.add(new_match)
            await self.repository.db.commit()
            
            # Return the data object to match your controller's return {"message": result.data}
            return Result.ok(data="Manual match created successfully.")
            
        except Exception as e:
            await self.repository.db.rollback()
            logging.error(f"MANUAL MATCH ERROR: {str(e)}")
            return Result.fail(f"Database error: {str(e)}")
    
    async def get_payment_logs(self, page: int, status: str, search: str):
        limit = 10
        skip = (page - 1) * limit
        
        payments, total_count = await self.repository.get_admin_payments(
            skip=skip, limit=limit, status=status, search=search
        )
        stats = await self.repository.get_payment_stats()
        
        return {
            "payments": payments,
            "stats": stats,
            "total_count": total_count
        }