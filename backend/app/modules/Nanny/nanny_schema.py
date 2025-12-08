from pydantic import BaseModel, Field
from app.db.models.types import NannyAvailability
import uuid

class NannySchema(BaseModel):
    national_id_number: str = Field(..., max_length=50)
    national_id_photo_url: str = Field(..., max_length=1024)
    address: str = Field(..., max_length=255)
    years_experience: int | None
    skills: str 
    preferred_location: str | None = Field(None, max_length=255)
    availability: NannyAvailability = Field(..., description="Nanny availability status", example=NannyAvailability.FULL_TIME)
    profile_photo_url: str | None = Field(None, max_length=1024)

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "national_id_number": "123456789",
                "national_id_photo_url": "https://example.com/id_photo.jpg",
                "address": "123 Main St, Nairobi, Kenya",
                "years_experience": 5,
                "skills": "Childcare, First Aid, Cooking",
                "preferred_location": "Nairobi",
                "availability": "FULL_TIME",
                "profile_photo_url": "https://example.com/profile_photo.jpg"
            }
        }

class NannyCreate(NannySchema):
    pass

class NannyUpdate(BaseModel):
    national_id_photo_url: str | None = Field(None, max_length=1024)
    address: str | None = Field(None, max_length=255)
    years_experience: int | None
    skills: str | None
    preferred_location: str | None = Field(None, max_length=255)
    availability: NannyAvailability | None
    profile_photo_url: str | None = Field(None, max_length=1024)

    class Config:
        orm_mode = True


class NannyResponse(NannySchema):
    id: uuid.UUID

    model_config = {
        "from_attributes":  True
    }