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

    async def initiate_batch_stk_push(
        self,
        match_ids: List[UUID],
        payer_user: models.User,
        phone_number: str,
        amount_per_nanny: float = 1.0 # Set your price here
    ) -> Result:
        try:
            total_amount = len(match_ids) * amount_per_nanny

            # 1. Create the Batch Payment Record
            payment_record = await self.payment_repository.create_batch_payment(
                user_id=payer_user.id,
                match_ids=match_ids,
                amount=total_amount,
                phone_number=phone_number
            )

            # 2. Trigger STK Push
            # We use the payment_record.id as the account reference
            stk_response = await sendStkPush(
                phone_number=phone_number,
                amount=total_amount,
                match_id=str(payment_record.id), 
                base_url=os.getenv("BASE_URL")
            )

            # 3. Update record with Daraja IDs
            payment_record.merchant_request_id = stk_response.get("MerchantRequestID")
            payment_record.checkout_request_id = stk_response.get("CheckoutRequestID")
            payment_record.payment_status = "pending"

            await self.db.commit()
            return Result.ok(data=stk_response)

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Batch STK Error: {e}")
            return Result.fail(f"Payment initiation failed: {str(e)}", 500)

    async def process_callback(self, callback_data: dict) -> Result:
        stk_payload = callback_data.get("Body", {}).get("stkCallback", {})
        checkout_id = stk_payload.get("CheckoutRequestID")
        result_code = stk_payload.get("ResultCode")

        payment = await self.payment_repository.get_by_checkout_id(checkout_id)
        if not payment:
            return Result.fail("Payment record not found", 404)

        if result_code == 0:
            metadata = stk_payload.get("CallbackMetadata", {}).get("Item", [])
            meta_dict = {item["Name"]: item.get("Value") for item in metadata}

            payment.mpesa_transaction_code = meta_dict.get("MpesaReceiptNumber")
            payment.payment_status = "completed"
            payment.result_code = result_code
            payment.result_desc = stk_payload.get("ResultDesc")
            payment.transaction_date = datetime.datetime.utcnow()

            # 🔥 UPDATE ALL LINKED MATCHES
            for match in payment.matches:
                match.status = MatchStatus.COMPLETED
                logger.info(f"Match {match.id} confirmed via batch payment {payment.id}")

        else:
            payment.payment_status = "failed"
            payment.result_code = result_code
            payment.result_desc = stk_payload.get("ResultDesc")

        await self.db.commit()
        return Result.ok(data={"status": "processed"})