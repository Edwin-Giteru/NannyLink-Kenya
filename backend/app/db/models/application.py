# from __future__ import annotations
# import uuid
# from datetime import datetime
# from typing import TYPE_CHECKING
# from sqlalchemy import DateTime, ForeignKey, Enum
# from sqlalchemy.orm import Mapped, mapped_column, relationship
# from sqlalchemy.dialects.postgresql import UUID
# from app.db.models.session.base import Base
# from app.db.models.types import ApplicationStatus



# if TYPE_CHECKING:
#     from .job_post import JobPost
#     from .nanny_profile import NannyProfile


# class Application(Base):
#     __tablename__ = "application"

#     id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("job_post.id", ondelete="CASCADE"), nullable=False)
#     nanny_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nanny_profile.id", ondelete="CASCADE"), nullable=False)
#     applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
#     created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
#     updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
#     status: Mapped[ApplicationStatus | None] = mapped_column(Enum(ApplicationStatus), nullable= False, default=ApplicationStatus.REVIEWING) # ← application status: pending / reviewing / interview / accepted / rejected

#     # relationships
#     job_post: Mapped["JobPost"] = relationship("JobPost", back_populates="applications")
#     nanny: Mapped["NannyProfile"] = relationship("NannyProfile", back_populates="applications")