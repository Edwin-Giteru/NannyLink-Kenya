from pydantic import BaseModel, Field
from typing import Optional
import uuid

class FamilyProf(BaseModel):
    household_location: str = Field(..., max_length=255)
    household_details: str


class FamilyCreate(FamilyProf):
    pass

class FamilyUpdate(BaseModel):
    household_location: str = Field(None, max_length=1024)
    household_address: str = Field(None, max_length=1024)
    
class FamilyResponse(FamilyProf):
    id: uuid.UUID

    model_config = {
        "from_attributes": True
    }