import os
import datetime
from loguru import logger
from sqlalchemy import select
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.results import Result
from app.utils.daraja_integration import sendStkPush
from app.db import models
from app.modules.payments.repository import PaymentRepository
from app.modules.Match.service import MatchService
from app.modules.Family.service import FamilyService


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.payment_repository = PaymentRepository(db)
        self.match_service = MatchService(db)
        # --- FIX: Initialize family_service here ---
        self.family_service = FamilyService(db)

    async def initiate_stk_push(
        self,
        match_id: UUID,
        payer_user: models.User,
        phone_number: str,
        amount: float = 1.0
    ) -> Result:
        try:
            # 1. Get the Family Profile linked to this User
            # Ensure your family_repository has 'get_family_by_user_id'
            family_profile = await self.family_service.family_repository.get_family_by_user_id(payer_user.id)
            if not family_profile:
                return Result.fail("Family profile not found for this user", 404)

            # 2. Verify the Match exists and belongs to this Family
            stmt = select(models.Match).where(
                models.Match.id == match_id,
                models.Match.family_id == family_profile.id
            )
            result = await self.db.execute(stmt)
            match = result.scalar_one_or_none()

            if not match:
                return Result.fail("No active match found for this connection", 404)

            # 3. Create local payment record
            payment_record = await self.payment_repository.create_payment(
                user_id=payer_user.id,
                match_id=match.id,
                amount=amount,
                phone_number=phone_number
            )

            # 4. Trigger Safaricom STK Push
            base_url = os.getenv("BASE_URL")
            stk_response = await sendStkPush(
                phone_number=phone_number,
                amount=amount,
                match_id=str(match.id), 
                base_url=base_url
            )

            # 5. Update record with Daraja IDs
            payment_record.merchant_request_id = stk_response.get("MerchantRequestID")
            payment_record.checkout_request_id = stk_response.get("CheckoutRequestID")
            
            await self.db.commit()
            return Result.ok(data=stk_response)

        except Exception as e:
            await self.db.rollback()
            logger.error(f"STK Initiation Error: {e}")
            return Result.fail(f"Could not initiate M-Pesa payment: {str(e)}", 500)

    async def process_callback(self, callback_data: dict) -> Result:
        """Handles the async response from Safaricom."""
        stk_payload = callback_data.get("Body", {}).get("stkCallback", {})
        checkout_id = stk_payload.get("CheckoutRequestID")
        result_code = stk_payload.get("ResultCode")

        payment = await self.payment_repository.get_by_checkout_id(checkout_id)
        if not payment:
            return Result.fail("Payment record not found", 404)

        if result_code == 0:
            # Success logic
            metadata = stk_payload.get("CallbackMetadata", {}).get("Item", [])
            meta_dict = {item["Name"]: item.get("Value") for item in metadata}

            payment.mpesa_transaction_code = meta_dict.get("MpesaReceiptNumber")
            payment.payment_status = "completed"
            
            # Update Match Status to PAID
            await self.match_service.update_match_status(
                payment.match_id, 
                models.MatchStatus.COMPLETED
            )
            logger.info(f"Payment Successful for Match {payment.match_id}")
        else:
            payment.payment_status = "failed"
            logger.warning(f"Payment Failed: {stk_payload.get('ResultDesc')}")

        await self.db.commit()
        return Result.ok(data={"status": "processed"})