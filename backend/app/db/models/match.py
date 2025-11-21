from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


if TYPE_CHECKING:
    from .job_post import JobPost
    from .nanny_profile import NannyProfile
    from .match_status import MatchStatus
    from .payment import Payment
    from .contract import Contract




class Match(Base):
    __tablename__ = "match"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, unique=True)
    selected_nanny_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    match_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)


    # relationships
    job_post: Mapped["JobPost"] = relationship("JobPost", back_populates="match", foreign_keys=[job_id])
    selected_nanny: Mapped["NannyProfile"] = relationship("NannyProfile", back_populates="matches", foreign_keys=[selected_nanny_id])
    status: Mapped["MatchStatus"] = relationship("MatchStatus", back_populates="matches", foreign_keys=[status_id])


    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="match")


    contract: Mapped["Contract | None"] = relationship("Contract", uselist=False, back_populates="match")