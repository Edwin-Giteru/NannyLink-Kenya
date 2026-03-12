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
        payment = Payment(
            user_id=user_id,
            match_id=match_id,
            amount=amount,
            phone_number=phone_number,
        )
        self.db.add(payment)
        await self.db.flush()
        return payment


    async def get_payments_by_match_id(self, match_id: UUID) -> List[Payment]:
        """Return ALL payments associated with a match, newest first."""
        stmt = (
            select(Payment)
            .where(Payment.match_id == match_id)
            .order_by(Payment.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_payment_by_id(self, payment_id: UUID) -> Payment | None:
        stmt = select(Payment).where(Payment.id == payment_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_checkout_request_id(self, checkout_id: str) -> Payment | None:
        stmt = select(Payment).where(Payment.checkout_request_id == checkout_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_payment(self, payment: Payment, **kwargs) -> Payment:
        for key, value in kwargs.items():
            if hasattr(payment, key):
                setattr(payment, key, value)
        self.db.add(payment)
        await self.db.flush()
        return payment