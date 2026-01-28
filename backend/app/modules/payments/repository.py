from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.payment import Payment
from uuid import UUID


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment(self, user_id: int, match_id: UUID, amount: float, phone_number: str) -> Payment:
        """
        order_id updated to UUID
        """
        payment = Payment(
            user_id=user_id,
            match_id=match_id,
            amount=amount,
            phone_number=phone_number
        )
        self.db.add(payment)
        await self.db.flush()
        return payment

    # async def update_payment(self, payment: Payment, status: str, mpesa_tx_id: str | None = None):
    #     payment.status = status
    #     if mpesa_tx_id:
    #         payment.transaction_id = mpesa_tx_id
    #     self.db.add(payment)
    #     await self.db.flush()
    #     return payment
    async  def get_match_by_id(self, match_id: UUID) -> Payment | None:
        stmt = select(Payment).where(Payment.match_id == match_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_payment(self, payment: Payment, **kwargs) -> Payment:
        for key, value in kwargs.items():
            setattr(payment, key, value)
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def get_by_checkout_request_id(self, checkout_id: str) -> Payment | None:
        stmt = select(Payment).where(Payment.checkout_request_id == checkout_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()