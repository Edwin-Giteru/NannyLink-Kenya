from pydantic import BaseModel, ConfigDict, Field, model_validator
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.db.models.types import MatchStatus

class FamilyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    name: str
    location: Optional[str] = Field(None, validation_alias="household_location")
    profile_picture_url: Optional[str] = None

class NannyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    # DB column is 'name', but we expose both 'name' AND 'full_name' so the frontend's
    # nanny?.full_name check resolves correctly
    name: str
    full_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    years_experience: Optional[int] = 0

    @model_validator(mode="after")
    def populate_full_name(self) -> "NannyBrief":
        # Mirror 'name' into 'full_name' so frontend gets both fields populated
        if not self.full_name:
            self.full_name = self.name
        return self

class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    status: MatchStatus
    nanny_id: UUID
    family_id: UUID
    match_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    family: Optional[FamilyBrief] = None
    nanny: Optional[NannyBrief] = None