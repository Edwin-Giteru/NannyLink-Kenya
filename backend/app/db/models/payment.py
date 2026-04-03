from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List
from sqlalchemy import DateTime, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base

if TYPE_CHECKING:
    from .user import User
    from .match import Match

class PaymentMatchLink(Base):
    __tablename__ = "payment_match_link"
    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payment.id", ondelete="CASCADE"), primary_key=True)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("match.id", ondelete="CASCADE"), primary_key=True)

class Payment(Base):
    __tablename__ = "payment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    amount: Mapped[float] = mapped_column(nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    
    checkout_request_id: Mapped[str | None] = mapped_column(String(255), index=True)
    merchant_request_id: Mapped[str | None] = mapped_column(String(255))
    mpesa_transaction_code: Mapped[str | None] = mapped_column(String(50))
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    
    result_code: Mapped[int | None] = mapped_column()
    result_desc: Mapped[str | None] = mapped_column(String(255))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    transaction_date: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="payments")
    
    # Use overlaps to tell SQLAlchemy we know these relationships share the same underlying join table columns
    matches: Mapped[List["Match"]] = relationship(
        "Match", 
        secondary="payment_match_link",
        back_populates="payments",
        overlaps="associated_payments" 
    )