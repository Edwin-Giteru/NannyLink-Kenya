from pydantic import BaseModel
import uuid

class ApplicationResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    nanny_id: uuid.UUID
