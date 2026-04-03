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
        self.family_service = FamilyService(db)

    async def initiate_stk_push(
        self,
        match_id: UUID,
        payer_user: models.User,
        phone_number: str,
        amount: float = 1.0
    ) -> Result:
        try:
            family_profile = await self.family_service.family_repository.get_family_by_user_id(payer_user.id)
            if not family_profile:
                return Result.fail("Family profile not found for this user", 404)

            stmt = select(models.Match).where(
                models.Match.id == match_id,
                models.Match.family_id == family_profile.id
            )
            result = await self.db.execute(stmt)
            match = result.scalar_one_or_none()

            if not match:
                return Result.fail("No active match found for this connection", 404)

            # FIX: Reuse existing payment record instead of creating a duplicate
            # The UniqueConstraint on (match_id, user_id) will cause an IntegrityError
            # if we try to INSERT again, losing the checkout_request_id silently
            existing_payments = await self.payment_repository.get_payments_by_match_id(match.id)
            payment_record = next(
                (p for p in existing_payments if str(p.user_id) == str(payer_user.id)),
                None
            )

            if not payment_record:
                payment_record = await self.payment_repository.create_payment(
                    user_id=payer_user.id,
                    match_id=match.id,
                    amount=amount,
                    phone_number=phone_number
                )

            # Trigger STK Push
            base_url = os.getenv("BASE_URL")
            stk_response = await sendStkPush(
                phone_number=phone_number,
                amount=amount,
                match_id=str(match.id),
                base_url=base_url
            )

            # FIX: Always overwrite Daraja IDs — this is what gets matched on callback
            payment_record.merchant_request_id = stk_response.get("MerchantRequestID")
            payment_record.checkout_request_id = stk_response.get("CheckoutRequestID")
            payment_record.payment_status = models.PaymentStatus.PENDING
            payment_record.phone_number = phone_number

            logger.info(
                f"STK initiated | match={match.id} "
                f"checkout_id={payment_record.checkout_request_id}"
            )

            await self.db.commit()
            return Result.ok(data=stk_response)

        except Exception as e:
            await self.db.rollback()
            logger.error(f"STK Initiation Error: {e}")
            return Result.fail(f"Could not initiate M-Pesa payment: {str(e)}", 500)

    async def process_callback(self, callback_data: dict) -> Result:
        """Handles the async response from Safaricom."""
        logger.info(f"Callback received: {callback_data}")

        stk_payload = callback_data.get("Body", {}).get("stkCallback", {})
        checkout_id = stk_payload.get("CheckoutRequestID")
        result_code = stk_payload.get("ResultCode")

        logger.info(f"Processing callback | checkout_id={checkout_id} result_code={result_code}")

        if not checkout_id:
            logger.error("Callback missing CheckoutRequestID")
            return Result.fail("Missing CheckoutRequestID", 400)

        payment = await self.payment_repository.get_by_checkout_id(checkout_id)
        if not payment:
            logger.error(f"No payment record found for checkout_id={checkout_id}")
            return Result.fail("Payment record not found", 404)

        if result_code == 0:
            metadata = stk_payload.get("CallbackMetadata", {}).get("Item", [])
            meta_dict = {item["Name"]: item.get("Value") for item in metadata}

            logger.info(f"Payment metadata: {meta_dict}")

            # FIX: assign enum value, not raw string
            payment.mpesa_transaction_code = meta_dict.get("MpesaReceiptNumber")
            payment.payment_status = models.PaymentStatus.COMPLETED
            payment.result_code = result_code
            payment.result_description = stk_payload.get("ResultDesc")
            # FIX: record the transaction timestamp from Safaricom
            raw_date = meta_dict.get("TransactionDate")
            if raw_date:
                try:
                    payment.transaction_date = datetime.datetime.strptime(
                        str(raw_date), "%Y%m%d%H%M%S"
                    )
                except ValueError:
                    payment.transaction_date = datetime.datetime.utcnow()
            else:
                payment.transaction_date = datetime.datetime.utcnow()

            await self.match_service.update_match_status(
                payment.match_id,
                models.MatchStatus.COMPLETED
            )
            logger.info(f"Payment completed | match={payment.match_id} receipt={payment.mpesa_transaction_code}")

        else:
            # FIX: assign enum, store result details for debugging
            payment.payment_status = models.PaymentStatus.FAILED
            payment.result_code = result_code
            payment.result_description = stk_payload.get("ResultDesc")
            logger.warning(
                f"Payment failed | checkout_id={checkout_id} "
                f"reason={stk_payload.get('ResultDesc')}"
            )

        await self.db.commit()
        return Result.ok(data={"status": "processed"})