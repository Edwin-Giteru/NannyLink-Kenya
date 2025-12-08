from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base


if TYPE_CHECKING:
    from .family_profile import FamilyProfile
    from .nanny_profile import NannyProfile
    from .payment import Payment
    from .contract_acceptance import ContractAcceptance
from app.db.models.types import UserRole as UserRoleEnum




class User(Base):
    __tablename__ = "user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(50), unique=True, nullable=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRoleEnum] = mapped_column(Enum(UserRoleEnum), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


    # relationships
    family_profile: Mapped["FamilyProfile | None"] = relationship("FamilyProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    nanny_profile: Mapped["NannyProfile | None"] = relationship("NannyProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="user")
    contract_acceptances: Mapped[list["ContractAcceptance"]] = relationship("ContractAcceptance", back_populates="acting_user")
    