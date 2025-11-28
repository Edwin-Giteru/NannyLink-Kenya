from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base


if TYPE_CHECKING:
    from .user import User




class UserRole(Base):
    __tablename__ = "user_role"


    id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    role_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)


    # One-to-Many: UserRole -> User
    users: Mapped[list["User"]] = relationship("User", back_populates="role")

