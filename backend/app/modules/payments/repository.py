from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.payment import Payment
from uuid import UUID
from typing import List

class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment(
        self,
        user_id: UUID,
        match_id: UUID,
        amount: float,
        phone_number: str,
    ) -> Payment:
        new_payment = Payment(
            user_id=user_id,
            match_id=match_id,
            amount=amount,
            phone_number=phone_number,
            payment_status="pending"
        )
        self.db.add(new_payment)
        await self.db.flush()
        return new_payment

    async def get_payments_by_match_id(self, match_id: UUID) -> List[Payment]:
        stmt = (
            select(Payment)
            .where(Payment.match_id == match_id)
            .order_by(Payment.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_checkout_id(self, checkout_request_id: str) -> Payment | None:
        stmt = select(Payment).where(Payment.checkout_request_id == checkout_request_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()