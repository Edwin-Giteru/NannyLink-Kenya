import os
import datetime
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.results import Result
from app.utils.daraja_integration import sendStkPush
from app.db import models
from app.modules.payments.repository import PaymentRepository
from app.modules.Match.service import MatchService

class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.payment_repository = PaymentRepository(db)
        self.match_service = MatchService(db)

    async def initiate_stk_push(
        self,
        match: models.Match,
        payer_user: models.User,
        phone_number: str,
        amount: float = 1.0  # Fees should be pulled from a config or Job model
    ) -> Result:
        try:
            # 1. Create local payment record
            payment_record = await self.payment_repository.create_payment(
                user_id=payer_user.id,
                match_id=match.id,
                amount=amount,
                phone_number=phone_number
            )

            # 2. Trigger Safaricom STK Push
            base_url = os.getenv("BASE_URL")
            stk_response = await sendStkPush(
                phone_number=phone_number,
                amount=amount,
                match_id=match.id,
                base_url=base_url
            )

            # 3. Update record with Daraja IDs
            payment_record.merchant_request_id = stk_response.get("MerchantRequestID")
            payment_record.checkout_request_id = stk_response.get("CheckoutRequestID")
            
            await self.db.commit()
            return Result.ok(data=stk_response)

        except Exception as e:
            await self.db.rollback()
            logger.error(f"STK Initiation Error: {e}")
            return Result.fail("Could not initiate M-Pesa payment", 500)

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
            
            # Update Match Status to PAID/COMPLETED
            await self.match_service.update_match_status(
                payment.match_id, 
                models.MatchStatus.PAID
            )
            logger.info(f"Payment Successful for Match {payment.match_id}")
        else:
            payment.payment_status = "failed"
            logger.warning(f"Payment Failed: {stk_payload.get('ResultDesc')}")

        await self.db.commit()
        return Result.ok(data={"status": "processed"})