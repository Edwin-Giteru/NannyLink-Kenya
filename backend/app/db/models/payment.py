from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


if TYPE_CHECKING:
    from .user import User
    from .match import Match




class Payment(Base):
    __tablename__ = "payment"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)


    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    mpesa_transaction_code: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    payment_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)


    match: Mapped["Match"] = relationship("Match", back_populates="payments", foreign_keys=[match_id])
    user: Mapped["User"] = relationship("User", back_populates="payments", foreign_keys=[user_id])