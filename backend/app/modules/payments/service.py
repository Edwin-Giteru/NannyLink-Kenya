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
        self.match_service = None
        self.repo = None

    def inject_repos(self, match_service, payment_repo):
        self.match_service = match_service
        self.repo = payment_repo

    async def initiate_payment(
        self,
        match: models.Match,
        current_user: models.User,
        phone_number: str,
        amount: float = 1.0,  # Default amount for testing; replace with actual fee in production
    ) -> Result:
        try:
            payment = await self.repo.create_payment(
                user_id=current_user.id,
                match_id=match.id,
                amount=amount,
                phone_number=phone_number,
            )

            base_url = os.getenv("BASE_URL")
            if not base_url:
                raise Exception("BASE_URL environment variable is not set.")
            response = await sendStkPush(
                phone_number=phone_number,
                amount=amount,
                match_id=match.id,
                base_url=base_url,          # ← pass base_url, NOT callback_url
            )

            merchant_request_id  = response.get("MerchantRequestID")
            checkout_request_id  = response.get("CheckoutRequestID")

            await self.repo.update_payment(
                payment,
                merchant_request_id=merchant_request_id,
                checkout_request_id=checkout_request_id,
            )

            await self.db.commit()
            await self.db.refresh(payment)

            logger.info(
                f"Payment {payment.id} initiated | "
                f"CheckoutRequestID={checkout_request_id}"
            )

            return Result.ok(
                data={
                    "payment_id": str(payment.id),
                    "merchant_request_id": merchant_request_id,
                    "checkout_request_id": checkout_request_id,
                },
                status_code=200,
            )

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Payment initiation failed: {e}", exc_info=True)
            return Result.fail(f"Payment initiation failed: {str(e)}", 500)

    async def handle_stk_callback(self, callback_data: dict) -> Result:
        try:
            stk = callback_data.get("Body", {}).get("stkCallback", {})
            merchant_request_id = stk.get("MerchantRequestID")
            checkout_request_id = stk.get("CheckoutRequestID")
            result_code         = stk.get("ResultCode")
            result_desc         = stk.get("ResultDesc")

            logger.info(
                f"Processing STK callback | "
                f"CheckoutRequestID={checkout_request_id} | "
                f"ResultCode={result_code} | "
                f"ResultDesc={result_desc}"
            )

            payment = await self.repo.get_by_checkout_request_id(checkout_request_id)
            if not payment:
                logger.warning(f"No payment found for CheckoutRequestID={checkout_request_id}")
                return Result.fail("No matching payment found.", 404)

            payment.result_code        = result_code
            payment.result_description = result_desc
            payment.merchant_request_id = merchant_request_id

            if result_code == 0:
                items = stk.get("CallbackMetadata", {}).get("Item", [])
                meta  = {item["Name"]: item.get("Value") for item in items}

                payment.mpesa_transaction_code = meta.get("MpesaReceiptNumber")
                payment.amount      = float(meta.get("Amount", payment.amount))
                payment.phone_number = str(meta.get("PhoneNumber", payment.phone_number))
                payment.payment_status = "completed"

                if meta.get("TransactionDate"):
                    try:
                        payment.transaction_date = datetime.datetime.strptime(
                            str(meta["TransactionDate"]), "%Y%m%d%H%M%S"
                        )
                    except ValueError:
                        pass

                # Update match status
                match_result = await self.match_service.get_match_by_id(payment.match_id)
                if match_result.success and match_result.data:
                    match_result.data.status = models.MatchStatus.PARTIALLY_PAID
                    self.db.add(match_result.data)
                    logger.info(f"Match {payment.match_id} → PARTIALLY_PAID")

            else:
                # Payment failed
                payment.payment_status = "failed"
                logger.warning(
                    f"Payment {payment.id} failed | "
                    f"ResultCode={result_code} | {result_desc}"
                )

            payment.updated_at = datetime.datetime.utcnow()
            self.db.add(payment)
            await self.db.commit()

            logger.info(f"Payment {payment.id} saved | status={payment.payment_status}")
            return Result.ok({"checkout_request_id": checkout_request_id}, 200)

        except Exception as e:
            await self.db.rollback()
            logger.error(f"STK callback processing error: {e}", exc_info=True)
            return Result.fail(f"Callback error: {str(e)}", 500)