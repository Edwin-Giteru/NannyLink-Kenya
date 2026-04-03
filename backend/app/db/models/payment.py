from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, String, Numeric, ForeignKey, Enum, Text, UniqueConstraint, TEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base
from app.db.models.types import PaymentStatus


if TYPE_CHECKING:
    from .user import User
    from .match import Match


# app/db/models/payment.py
class Payment(Base):
    __tablename__ = "payment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    amount: Mapped[float] = mapped_column(nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    match_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("match.id"), nullable=True) # Optional direct link for single payments, but batch payments will use the helper table
    # M-Pesa Tracking
    checkout_request_id: Mapped[str | None] = mapped_column(String(255), index=True)
    merchant_request_id: Mapped[str | None] = mapped_column(String(255))
    mpesa_transaction_code: Mapped[str | None] = mapped_column(String(50))
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    transaction_date: Mapped[datetime | None] = mapped_column(DateTime)
    payment_date: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    result_code: Mapped[int | None] = mapped_column()
    result_desc: Mapped[str | None] = mapped_column(String(255))
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="payments")
    match: Mapped["Match | None"] = relationship("Match", back_populates="payments")
    # A single payment now links to multiple matches
# Helper table for Batch Payments
class PaymentMatchLink(Base):
    __tablename__ = "payment_match_link"
    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payment.id"), primary_key=True)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("match.id"), primary_key=True)