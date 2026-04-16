import os
import datetime
from loguru import logger
from sqlalchemy import select
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.utils.results import Result
from app.utils.daraja_integration import sendStkPush
from app.db import models
from app.db.models.types import PaymentStatus, MatchStatus
from app.modules.payments.repository import PaymentRepository
from app.modules.Match.service import MatchService
from app.modules.Family.service import FamilyService

class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.payment_repository = PaymentRepository(db)
        self.match_service = MatchService(db)
        self.family_service = FamilyService(db)

    async def initiate_stk_push(
        self,
        match_ids: List[UUID],
        payer_user: models.User,
        phone_number: str,
        amount_per_nanny: float = 1.0 
    ) -> Result:
        try:
            if not match_ids:
                return Result.fail("No match IDs provided", 400)

            total_amount = len(match_ids) * amount_per_nanny

            # 1. Create the Payment Record
            payment_record = await self.payment_repository.create_batch_payment(
                user_id=payer_user.id,
                match_ids=match_ids,
                amount=total_amount,
                phone_number=phone_number
            )

            # 2. Trigger STK Push
            # We pass str(payment_record.id) to track this specific payment
            stk_response = await sendStkPush(
                phone_number=phone_number,
                amount=total_amount,
                match_id=str(payment_record.id), 
                base_url=os.getenv("BASE_URL", "http://localhost:8000")
            )

            # 3. Handle M-Pesa Response
            if "CheckoutRequestID" not in stk_response:
                error_msg = stk_response.get("errorMessage", "Daraja Gateway Error")
                return Result.fail(error_msg, 400)

            payment_record.merchant_request_id = stk_response.get("MerchantRequestID")
            payment_record.checkout_request_id = stk_response.get("CheckoutRequestID")
            payment_record.payment_status = "pending"

            await self.db.commit()
            return Result.ok(data=stk_response)

        except Exception as e:
            await self.db.rollback()
            # This logger will now show exactly where it failed in your console
            logger.exception("STK Initiation Critical Failure") 
            return Result.fail(f"Payment initiation failed: {str(e)}", 500)
        
    async def process_callback(self, callback_data: dict) -> Result:
        stk_payload = callback_data.get("Body", {}).get("stkCallback", {})
        checkout_id = stk_payload.get("CheckoutRequestID")
        result_code = stk_payload.get("ResultCode")

        # This will now include the .matches list thanks to the model fix
        payment = await self.payment_repository.get_by_checkout_id(checkout_id)
        if not payment:
            logger.error(f"Callback received for unknown checkout_id: {checkout_id}")
            return Result.fail("Payment record not found", 404)

        if result_code == 0:
            metadata = stk_payload.get("CallbackMetadata", {}).get("Item", [])
            meta_dict = {item["Name"]: item.get("Value") for item in metadata}

            payment.mpesa_transaction_code = meta_dict.get("MpesaReceiptNumber")
            payment.payment_status = "completed"
            payment.result_code = result_code
            payment.result_desc = "The service was accepted successfully"
            payment.transaction_date = datetime.datetime.utcnow()

            # Update all linked matches to COMPLETED
            if payment.matches:
                for match in payment.matches:
                    match.status = MatchStatus.COMPLETED
                    logger.info(f"Match {match.id} activated via Payment {payment.id}")
        else:
            payment.payment_status = "failed"
            payment.result_code = result_code
            payment.result_desc = stk_payload.get("ResultDesc")

        try:
            await self.db.commit()
            return Result.ok(data={"status": "processed"})
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error committing callback update: {e}")
            return Result.fail("Internal server error during callback processing", 500)