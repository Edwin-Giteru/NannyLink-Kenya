from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base


if TYPE_CHECKING:
    from .user import User
    from .job_post import JobPost
    from .match import Match




class FamilyProfile(Base):
    __tablename__ = "family_profile"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    household_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    household_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # relationships
    user: Mapped["User"] = relationship("User", back_populates="family_profile", foreign_keys=[user_id])
    job_posts: Mapped[list["JobPost"]] = relationship("JobPost", back_populates="family_profile", cascade="all, delete-orphan")
    matches: Mapped[list["Match"]] = relationship("Match", back_populates="family")

