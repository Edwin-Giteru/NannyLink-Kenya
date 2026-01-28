from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base
from app.db.models.types import MatchStatus
from app.db.models.family_profile import FamilyProfile




if TYPE_CHECKING:
    from .job_post import JobPost
    from .nanny_profile import NannyProfile
    from .payment import Payment
    from .contract import Contract


class Match(Base):
    __tablename__ = "match"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_post.id"), nullable=False, unique=True)
    selected_nanny_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nanny_profile.id"), nullable=False)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_profile.id"), nullable=False)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus, native_enum=False), default=MatchStatus.AWAITING_PAYMENT)
    match_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


    # relationships
    selected_nanny: Mapped["NannyProfile"] = relationship("NannyProfile", back_populates="matches")
    family: Mapped["FamilyProfile"] = relationship("FamilyProfile", back_populates="matches")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="match")
    job_post: Mapped["JobPost"] = relationship("JobPost",  back_populates="match")
    contract: Mapped["Contract | None"] = relationship("Contract", uselist=False, back_populates="match")