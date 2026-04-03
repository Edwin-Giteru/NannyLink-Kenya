from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import List, Optional


class PaymentBatchInitSchema(BaseModel):
    match_ids: List[UUID]
    phone_number: str

class PaymentResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    amount: Optional[float] = None
    phone_number: Optional[str] = None
    payment_status: Optional[str] = None
    mpesa_transaction_code: Optional[str] = None
    checkout_request_id: Optional[str] = None
    merchant_request_id: Optional[str] = None
    result_code: Optional[int] = None
    # Alembic detected you changed this to result_desc in the DB
    result_desc: Optional[str] = None 

    transaction_date: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True