from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class PaymentInitSchema(BaseModel):
    """Body is not used for initiation (params come as query strings),
    but kept here for documentation purposes."""
    phone_number: str


class PaymentResponseSchema(BaseModel):
    """
    Matches the actual Payment ORM model columns:
      id, match_id, user_id, amount, phone_number,
      payment_status, mpesa_transaction_code,
      checkout_request_id, merchant_request_id,
      result_code, result_description, transaction_date,
      payment_date, created_at, updated_at
    """
    id: UUID
    match_id: UUID
    user_id: UUID
    amount: Optional[float] = None
    phone_number: Optional[str] = None

    # M-Pesa fields
    payment_status: Optional[str] = None
    mpesa_transaction_code: Optional[str] = None
    checkout_request_id: Optional[str] = None
    merchant_request_id: Optional[str] = None
    result_code: Optional[int] = None
    result_description: Optional[str] = None

    # Dates
    transaction_date: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True   # Pydantic v2
        populate_by_name = True