from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.results import Result
from app.utils.daraja_integration import sendStkPush
from app.db import models
import os
import datetime

class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.match_service = None  # injected below
        self.repo = None  # injected below

    def inject_repos(self, match_service, payment_repo):
        """Inject the repositories to avoid circular import issues"""
        self.match_service = match_service
        self.repo = payment_repo

    async def initiate_payment(self, match: models.Match, current_user: models.User, phone_number: str) -> Result:
        try:
            family_user_id = match.family.user_id
            nanny_user_id = match.selected_nanny.user_id

            if current_user.id not in (family_user_id, nanny_user_id):
                return Result.fail("You are not authorized to pay for this match.", 403)

            payment = await self.repo.create_payment(
                user_id=current_user.id,
                match_id=match.id,
                amount=1.0,
                phone_number=phone_number
            )

            # --- Send Daraja STK Push ---
            callback_url = os.getenv("BASE_URL")
            if not callback_url:
                raise Exception("Callback URL not configured")

            response = sendStkPush(
                phone_number=phone_number,
                amount=1.0,
                match_id=match.id,
                callback_url=callback_url
            )

            merchant_request_id = response.get("MerchantRequestID")
            checkout_request_id = response.get("CheckoutRequestID")

            await self.repo.update_payment(
                payment,
                status="initiated",
                merchant_request_id=merchant_request_id,
                checkout_request_id=checkout_request_id
            )

            await self.db.commit()
            await self.db.refresh(payment)

            logger.info(f"Payment {payment.id} initiated for CheckoutRequestID={checkout_request_id}")

            return Result.ok(
                data={
                    "payment_id": payment.id,
                    "merchant_request_id": merchant_request_id,
                    "checkout_request_id": checkout_request_id
                },
                status_code=200
            )

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Payment initiation failed: {e}", exc_info=True)
            return Result.fail(f"Payment initiation failed: {str(e)}", 500)

    async def handle_stk_callback(self, callback_data: dict) -> Result:
        try:
            stk_callback = callback_data.get("Body", {}).get("stkCallback", {})
            merchant_request_id = stk_callback.get("MerchantRequestID")
            checkout_request_id = stk_callback.get("CheckoutRequestID")
            result_code = stk_callback.get("ResultCode")
            result_desc = stk_callback.get("ResultDesc")

            logger.info(f"Handling callback for CheckoutRequestID={checkout_request_id}")

            payment = await self.repo.get_by_checkout_request_id(checkout_request_id)
            if not payment:
                logger.warning(f"No payment found for CheckoutRequestID: {checkout_request_id}")
                return Result.fail("No matching payment found.", 404)

            payment.result_code = result_code
            payment.result_description = result_desc

            if result_code == 0:
                metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
                data_map = {item["Name"]: item.get("Value") for item in metadata}

                payment.mpesa_transaction_code = data_map.get("MpesaReceiptNumber")
                payment.amount = float(data_map.get("Amount", 0))
                payment.phone_number = str(data_map.get("PhoneNumber", payment.phone_number))
                payment.transaction_date = (
                    datetime.datetime.strptime(str(data_map.get("TransactionDate")), "%Y%m%d%H%M%S")
                    if data_map.get("TransactionDate")
                    else None
                )
                payment.merchant_request_id = merchant_request_id

                match = await self.match_service.get_match_by_id(payment.match_id)
                if match.success and match.data:
                    match_instance = match.data
                    match_instance.status = models.MatchStatus.PARTIALLY_PAID
                    self.db.add(match_instance)
                    logger.info(f"Match {match_instance.id} marked as PARTIALLY_PAID.")
                    payment.payment_status = "completed"

                else:
                    payment.payment_status = "failed"
                    match = await self.match_service.get_match_by_id(payment.match_id)
                    if match.success and match.data:
                        match_instance = match.data
                        match_instance.status = models.MatchStatus.AWAITING_PAYMENT
                        self.db.add(match_instance)
                        logger.info(f"Match {match_instance.id} remains AWAITING_PAYMENT.")                     

            payment.updated_at = datetime.datetime.utcnow()
            self.db.add(payment)
            await self.db.commit()

            return Result.ok({"checkout_request_id": checkout_request_id}, 200)

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error handling STK callback: {e}", exc_info=True)
            return Result.fail(f"Callback error: {str(e)}", 500)