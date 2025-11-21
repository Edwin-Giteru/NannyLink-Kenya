from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


if TYPE_CHECKING:
    from .family_profile import FamilyProfile
    from .application import Application
    from .nanny_profile import NannyProfile
    from .match import Match




class JobPost(Base):
    __tablename__ = "job_post"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)


    title: Mapped[str] = mapped_column(String(255), nullable=False)
    childcare_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    hours: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duties: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    required_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


    # relationships
    family_profile: Mapped["FamilyProfile"] = relationship("FamilyProfile", back_populates="job_posts", foreign_keys=[family_id])


    applications: Mapped[list["Application"]] = relationship("Application", back_populates="job_post", cascade="all, delete-orphan")


    # Direct many-to-many to NannyProfile via Application: use relationship(..., secondary=...) if needed
    applicants: Mapped[list["NannyProfile"]] = relationship("NannyProfile", secondary="application", back_populates="applications")


    match: Mapped["Match | None"] = relationship("Match", uselist=False, back_populates="job_post")