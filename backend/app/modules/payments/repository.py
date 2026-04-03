from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.models.payment import Payment, PaymentMatchLink
from uuid import UUID
from typing import List, Optional

class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_batch_payment(
        self,
        user_id: UUID,
        match_ids: List[UUID],
        amount: float,
        phone_number: str,
    ) -> Payment:
        # 1. Create the base payment record
        new_payment = Payment(
            user_id=user_id,
            amount=amount,
            phone_number=phone_number,
            payment_status="pending"
        )
        self.db.add(new_payment)
        await self.db.flush() 

        # 2. Link each match to this payment via the helper table
        for m_id in match_ids:
            link = PaymentMatchLink(
                payment_id=new_payment.id,
                match_id=m_id
            )
            self.db.add(link)
        
        await self.db.flush()
        return new_payment

    async def get_by_checkout_id(self, checkout_request_id: str) -> Optional[Payment]:
        # We use selectinload to eagerly load the linked matches for the callback logic
        stmt = (
            select(Payment)
            .where(Payment.checkout_request_id == checkout_request_id)
            .options(selectinload(Payment.matches))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_payments(self, user_id: UUID) -> List[Payment]:
        stmt = select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())