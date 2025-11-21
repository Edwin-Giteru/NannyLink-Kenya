from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


if TYPE_CHECKING:
    from .user_role import UserRole
    from .family_profile import FamilyProfile
    from .nanny_profile import NannyProfile
    from .payment import Payment
    from .contract_acceptance import ContractAcceptance




class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(50), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)


    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)


    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


    # relationships
    role: Mapped["UserRole"] = relationship("UserRole", back_populates="users", foreign_keys=[role_id])

    family_profile: Mapped["FamilyProfile | None"] = relationship(
    "FamilyProfile", uselist=False, back_populates="user", cascade="all, delete-orphan"
    )
    nanny_profile: Mapped["NannyProfile | None"] = relationship(
    "NannyProfile", uselist=False, back_populates="user", cascade="all, delete-orphan"
    )


    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="user")


    contract_acceptances: Mapped[list["ContractAcceptance"]] = relationship(
    "ContractAcceptance", back_populates="acting_user"
    )