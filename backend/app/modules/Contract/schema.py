from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class ContractAcceptanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    contract_id: UUID
    family_accepted: bool = False
    nanny_accepted: bool = False
    family_acceptance_date: Optional[datetime] = None
    nanny_acceptance_date: Optional[datetime] = None
    acting_user_id: Optional[UUID] = None

class FamilyShortResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    household_location: Optional[str] = None

class NannyShortResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    full_name: Optional[str] = None

class MatchShortResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    family: Optional[FamilyShortResponse] = None
    nanny: Optional[NannyShortResponse] = None

class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    match_id: UUID
    contract_text: Optional[str] = None
    generation_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    acceptance: Optional[ContractAcceptanceResponse] = None
    match: Optional[MatchShortResponse] = None