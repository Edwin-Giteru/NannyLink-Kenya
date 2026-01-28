from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base
from app.db.models.types import NannyAvailability as AvailabilityEnum
from app.db.models.types import JobStatus as JobEnum


if TYPE_CHECKING:
    from .family_profile import FamilyProfile
    from .application import Application
    from .nanny_profile import NannyProfile
    from .match import Match




class JobPost(Base):
    __tablename__ = "job_post"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_profile.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255))
    care_needs: Mapped[str | None] = mapped_column(Text)
    availability: Mapped[AvailabilityEnum] = mapped_column(Enum(AvailabilityEnum), nullable=False)
    duties: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(255))
    salary: Mapped[float] = mapped_column(Numeric(10, 2))
    required_experience: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[JobEnum] = mapped_column(Enum(JobEnum), default=JobEnum.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


    match: Mapped["Match | None"] = relationship("Match",  back_populates="job_post", uselist=False) 
    family_profile = relationship("FamilyProfile", back_populates="job_posts")
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="job_post", cascade="all, delete-orphan")
    applicants: Mapped[list["NannyProfile"]] = relationship("NannyProfile", secondary="application", viewonly=True)