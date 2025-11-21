from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


if TYPE_CHECKING:
    from .user import User
    from .vetting_document import VettingDocument
    from .application import Application
    from .job_post import JobPost
    from .match import Match




class NannyProfile(Base):
    __tablename__ = "nanny_profile"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)


    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    availability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vetting_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    profile_photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)


    # relationships
    user: Mapped["User"] = relationship("User", back_populates="nanny_profile", foreign_keys=[user_id])


    vetting_documents: Mapped[list["VettingDocument"]] = relationship("VettingDocument", back_populates="nanny", cascade="all, delete-orphan")


    applications: Mapped[list["Application"]] = relationship("Application", back_populates="nanny", cascade="all, delete-orphan")


    matches: Mapped[list["Match"]] = relationship("Match", back_populates="selected_nanny")