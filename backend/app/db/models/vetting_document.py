from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.models.session.base import Base


if TYPE_CHECKING:
    from .nanny_profile import NannyProfile
    from .document_type import DocumentType




class VettingDocument(Base):
    __tablename__ = "vetting_document"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nanny_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nanny_profile.id"), nullable=False)
    doc_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_type.id"),  nullable=False)


    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


    nanny: Mapped["NannyProfile"] = relationship("NannyProfile", back_populates="vetting_documents", foreign_keys=[nanny_id])
    doc_type: Mapped["DocumentType"] = relationship("DocumentType", back_populates="vetting_documents", foreign_keys=[doc_type_id])

