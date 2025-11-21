from __future__ import annotations
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


if TYPE_CHECKING:
    from .vetting_document import VettingDocument




class DocumentType(Base):
    __tablename__ = "document_type"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    vetting_documents: Mapped[list["VettingDocument"]] = relationship("VettingDocument", back_populates="doc_type")

