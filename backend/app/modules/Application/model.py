from pydantic import BaseModel
import uuid


class JobPostSummary(BaseModel):
    id: uuid.UUID
    title: str
    location: str | None
    salary: float | None
    availability: str | None
    care_needs: str | None
    status: str | None          # job status: open / closed

    model_config = {"from_attributes": True}


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    nanny_id: uuid.UUID
    status: str                 # ← application status: pending / reviewing / interview / accepted / rejected
    applied_at: datetime
    created_at: datetime
    updated_at: datetime
    job_post: JobPostSummary | None

    model_config = {"from_attributes": True}

