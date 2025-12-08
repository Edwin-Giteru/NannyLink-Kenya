from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base


if TYPE_CHECKING:
    from .job_post import JobPost
    from .nanny_profile import NannyProfile
    from .match_status import MatchStatus
    from .payment import Payment
    from .contract import Contract




class Match(Base):
    __tablename__ = "match"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_post.id"), nullable=False, unique=True)
    selected_nanny_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nanny_profile.id"), nullable=False)
    status_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("match_status.id"), nullable=False)
    match_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)


    # relationships
    selected_nanny: Mapped["NannyProfile"] = relationship("NannyProfile", back_populates="matches", foreign_keys=[selected_nanny_id])
    status: Mapped["MatchStatus"] = relationship("MatchStatus", back_populates="matches", foreign_keys=[status_id])
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="match")
    job_post: Mapped["JobPost"] = relationship("JobPost",  back_populates="match")
    contract: Mapped["Contract | None"] = relationship("Contract", uselist=False, back_populates="match")