from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base
from app.db.models.types import MatchStatus

if TYPE_CHECKING:
    from .nanny_profile import NannyProfile
    from .family_profile import FamilyProfile
    from .payment import Payment
    from .contract import Contract

class Match(Base):
    __tablename__ = "match"
    __table_args__ = (
             UniqueConstraint("family_id", "nanny_id", name="uix_family_nanny_match"),
        )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_profile.id", ondelete="CASCADE"), nullable=False)
    nanny_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nanny_profile.id", ondelete="CASCADE"), nullable=False)
    
    # Status tracks the lifecycle: AWAITING_PAYMENT -> COMPLETED (Connected)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus, native_enum=False), default=MatchStatus.AWAITING_PAYMENT)
    
    match_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    family: Mapped["FamilyProfile"] = relationship("FamilyProfile", back_populates="matches")
    nanny: Mapped["NannyProfile"] = relationship("NannyProfile", back_populates="matches")
    payments: Mapped[list["Payment"]] = relationship(
            "Payment", 
            secondary="payment_match_link", 
            back_populates="matches",
            overlaps="matches"
        )    
    contract: Mapped["Contract | None"] = relationship("Contract", uselist=False, back_populates="match")