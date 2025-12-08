from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base
from sqlalchemy import Enum
from app.db.models.types import VettingStatus, NannyAvailability
if TYPE_CHECKING:
    from .user import User
    from .vetting_document import VettingDocument
    from .application import Application
    from .job_post import JobPost


class NannyProfile(Base):
    __tablename__ = "nanny_profile"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    national_id_number: Mapped[str | None] = mapped_column(String(50), unique=True)
    national_id_photo_url: Mapped[str | None] = mapped_column(String(1024))
    address: Mapped[str | None] = mapped_column(String(255))
    years_experience: Mapped[int | None] = mapped_column(Integer)
    skills: Mapped[str | None] = mapped_column(Text)
    preferred_location: Mapped[str | None] = mapped_column(String(255))
    availability: Mapped[str | None] = mapped_column(Enum(NannyAvailability), nullable=False, default=NannyAvailability.FULL_TIME)
    vetting_status: Mapped[str | None] = mapped_column(Enum(VettingStatus), nullable=False, default=VettingStatus.PENDING)
    profile_photo_url: Mapped[str | None] = mapped_column(String(1024))

    # relationships
    user: Mapped["User"] = relationship("User", back_populates="nanny_profile")

    vetting_documents: Mapped[list["VettingDocument"]] = relationship("VettingDocument", back_populates="nanny",  cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="nanny", cascade="all, delete-orphan")
    applied_jobs: Mapped[list["JobPost"]] = relationship("JobPost", secondary="application", viewonly=True)
    matches: Mapped[list["Match"]] = relationship("Match", back_populates="selected_nanny")
