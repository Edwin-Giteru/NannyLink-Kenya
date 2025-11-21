from __future__ import annotations
import uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base




class MatchStatus(Base):
    __tablename__ = "match_status"


    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status_name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)


    matches: Mapped[list["Match"]] = relationship("Match", back_populates="status")