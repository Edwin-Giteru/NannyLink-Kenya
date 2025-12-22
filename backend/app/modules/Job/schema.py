from pydantic import BaseModel, Field, computed_field
from app.db.models.types import NannyAvailability as AvailabilityEnum
from app.db.models.types import JobStatus as JobEnum
from uuid import UUID
from typing import Optional

class JobBase(BaseModel):
    title: str
    care_needs: Optional[str]
    availability: AvailabilityEnum = Field(..., description="Availability", examples=[AvailabilityEnum.FULL_TIME])
    salary:  float = Field(...)
    duties: str = Field(..., max_length=255)
    location: str = Field(..., max_length=255)
    required_experience: int 

    class Config:
        orm_mode =  True

class JobCreate(JobBase):
    pass


class JobResponse(JobBase):
    id: UUID
    status: JobEnum

    @computed_field
    @property
    def hourly_rate(self) -> float:
        hourly_map = {
            AvailabilityEnum.FULL_TIME: 50,
            AvailabilityEnum.PART_TIME: 30,
            AvailabilityEnum.EVENINGS: 15,
            AvailabilityEnum.WEEKENDS: 20
        }

        weekly_hours = hourly_map.get(self.availability, 40)
        monthly_hours = weekly_hours * 4

        return  round( self.salary / monthly_hours, 2 )
    
    model_config = {
        "from_attributes": True
    }

class JobUpdate(BaseModel):
    title: str
    care_needs: Optional[str]
    availability: Optional[AvailabilityEnum]
    salary:  Optional[float] | None = None
    duties: Optional[str] 
    location: Optional[str]
    required_experience: Optional[int] | None = None