from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.db.models.types import MatchStatus

class FamilyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    # Map 'household_location' from DB to 'location' in JSON
    location: Optional[str] = Field(None, validation_alias="household_location")
    profile_picture_url: Optional[str] = None

class NannyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str # Matches NannyProfile.name
    profile_picture_url: Optional[str] = None

class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: MatchStatus
    nanny_id: UUID
    family_id: UUID
    match_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Use the consolidated Brief schemas
    family: Optional[FamilyBrief] = None
    nanny: Optional[NannyBrief] = None