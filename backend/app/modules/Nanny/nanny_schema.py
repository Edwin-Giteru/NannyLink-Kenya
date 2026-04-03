from pydantic import BaseModel, Field
from app.db.models.types import NannyAvailability, VettingStatus
import uuid

class NannyBase(BaseModel):
    national_id_number: str = Field(..., max_length=50)
    national_id_photo_url: str = Field(..., max_length=1024)
    name: str = Field(..., max_length=255)
    address: str = Field(..., max_length=255)
    years_experience: int | None = None
    skills: str
    preferred_location: str | None = Field(None, max_length=255)
    availability: NannyAvailability = Field(..., description="Nanny availability status")
    profile_photo_url: str | None = Field(None, max_length=1024)

    class Config:
        orm_mode = True

class NannyCreate(NannyBase):
    # vetting_status deliberately excluded — system sets it, not the user
    pass

class NannyUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    national_id_photo_url: str | None = Field(None, max_length=1024)
    address: str | None = Field(None, max_length=255)
    years_experience: int | None = None
    skills: str | None = None
    preferred_location: str | None = Field(None, max_length=255)
    availability: NannyAvailability | None = None
    profile_photo_url: str | None = Field(None, max_length=1024)

    class Config:
        orm_mode = True

class NannyResponse(NannyBase):
    id: uuid.UUID
    # FIX: default to PENDING so it's never None, use_enum_values serializes to plain string
    vetting_status: VettingStatus = VettingStatus.PENDING

    model_config = {
        "from_attributes": True,
        "use_enum_values": True
    }