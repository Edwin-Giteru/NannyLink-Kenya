from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class PaymentSchema(BaseModel):
    phone_number: str = Field(..., alias="phoneNumber")

class PaymentResponseSchema(BaseModel):
    id: UUID
    user_id: UUID = Field(..., alias="userId")
    match_id: UUID = Field(..., alias="matchId")
    amount: float
    status: str
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True