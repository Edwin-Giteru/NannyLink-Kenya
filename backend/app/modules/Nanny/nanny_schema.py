from pydantic import BaseModel, Field
from app.db.models.types import NannyAvailability, VettingStatus
import uuid
from typing import Optional

class NannyBase(BaseModel):
    national_id_number: Optional[str] = Field(None, max_length=50)
    national_id_photo_url: Optional[str] = Field(None, max_length=1024)
    name: str = Field(..., max_length=255)
    address: Optional[str] = Field(None, max_length=255)
    years_experience: Optional[int] = None
    skills: Optional[str] = None
    preferred_location: Optional[str] = Field(None, max_length=255)
    availability: NannyAvailability = Field(..., description="Nanny availability status")
    profile_photo_url: Optional[str] = Field(None, max_length=1024)

    class Config:
        orm_mode = True

class NannyCreate(NannyBase):
    pass

class NannyUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    national_id_photo_url: Optional[str] = Field(None, max_length=1024)
    address: Optional[str] = Field(None, max_length=255)
    years_experience: Optional[int] = None
    skills: Optional[str] = None
    preferred_location: Optional[str] = Field(None, max_length=255)
    availability: Optional[NannyAvailability] = None
    profile_photo_url: Optional[str] = Field(None, max_length=1024)

    class Config:
        orm_mode = True

class NannyResponse(NannyBase):
    id: uuid.UUID
    vetting_status: VettingStatus = VettingStatus.PENDING

    model_config = {
        "from_attributes": True,
        "use_enum_values": True
    }