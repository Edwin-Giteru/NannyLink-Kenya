from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional


class JobPostBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    location: Optional[str] = None
    salary: Optional[float] = None
    availability: Optional[str] = None
    care_needs: Optional[str] = None
    required_experience: Optional[int] = None
    duties: Optional[str] = None


class FamilyBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: Optional[str] = None      # pulled from FamilyProfile.name
    location: Optional[str] = None  # pulled from FamilyProfile.location


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    selected_nanny_id: UUID
    family_id: UUID
    status: str
    match_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    job_post: Optional[JobPostBrief] = None
    family:   Optional[FamilyBrief]  = None
