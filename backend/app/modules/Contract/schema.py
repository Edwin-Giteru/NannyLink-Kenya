from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
 
 
class ContractAcceptanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    contract_id: UUID
    family_accepted: Optional[bool] = False
    nanny_accepted: Optional[bool] = False
    family_acceptance_date: Optional[datetime] = None
    nanny_acceptance_date: Optional[datetime] = None
    acting_user_id: UUID
 
 
class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    id: UUID
    match_id: UUID
    contract_text: Optional[str] = None
    generation_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    acceptance: Optional[ContractAcceptanceResponse] = None
 
 
class ContractGenerateRequest(BaseModel):
    """Optional body — allows overriding auto-generated text."""
    contract_text: Optional[str] = None
 
 
class ContractAcceptRequest(BaseModel):
    """Empty body — role is inferred from JWT."""
    pass