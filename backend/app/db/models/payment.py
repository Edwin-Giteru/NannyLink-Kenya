from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, String, Numeric, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base
from app.db.models.types import PaymentStatus


if TYPE_CHECKING:
    from .user import User
    from .match import Match


class Payment(Base):
    __tablename__ = "payment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("match.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("match_id", "user_id", name="uix_match_user"),
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    mpesa_transaction_code: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, native_enum=False), default=PaymentStatus.PENDING)
    payment_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    checkout_request_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    merchant_request_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result_code: Mapped[int | None] = mapped_column(nullable=True)
    result_description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phone_number: Mapped[str] = mapped_column(String(15), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # relationships
    match: Mapped["Match"] = relationship("Match", back_populates="payments", foreign_keys=[match_id])
    user: Mapped["User"] = relationship("User", back_populates="payments", foreign_keys=[user_id])