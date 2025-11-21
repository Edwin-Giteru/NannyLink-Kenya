from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


if TYPE_CHECKING:
    from .contract import Contract
    from .user import User




class ContractAcceptance(Base):
    __tablename__ = "contract_acceptance"

    # contract_id acts as PK and FK to contract.id to ensure one-to-one
    contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)


    family_accepted: Mapped[bool | None] = mapped_column(Boolean, default=False)
    nanny_accepted: Mapped[bool | None] = mapped_column(Boolean, default=False)


    family_acceptance_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    nanny_acceptance_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


    # Track which user recorded the acceptance action (many-to-one required in schema)
    acting_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)


    contract: Mapped["Contract"] = relationship("Contract", back_populates="acceptance", foreign_keys=[contract_id])
    acting_user: Mapped["User"] = relationship("User", back_populates="contract_acceptances", foreign_keys=[acting_user_id])