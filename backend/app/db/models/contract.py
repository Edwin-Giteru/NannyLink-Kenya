from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base


if TYPE_CHECKING:
    from .match import Match
    from .contract_acceptance import ContractAcceptance




class Contract(Base):
    __tablename__ = "contract"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("match.id"), nullable=False, unique=True)

    contract_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    generation_date: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)

    match: Mapped["Match"] = relationship("Match", back_populates="contract", foreign_keys=[match_id])
    acceptance: Mapped["ContractAcceptance | None"] = relationship("ContractAcceptance", uselist=False, back_populates="contract", cascade="all, delete-orphan")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)