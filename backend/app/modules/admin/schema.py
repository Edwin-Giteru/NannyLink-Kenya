from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.db.models.types import MatchStatus, UserRole, VettingStatus


class DashboardStatsSchema(BaseModel):
    total_revenue: float
    completed_revenue: float
    pending_revenue: float
    revenue_growth_percentage: float
    
    total_users: int
    total_families: int
    total_nannies: int
    
    awaiting_payment_matches: int
    completed_placements: int
    match_success_rate: float
    
    mpesa_success_rate: float

class RecentTransactionSchema(BaseModel):
    transaction_id: Optional[str]
    user_name: str
    user_avatar: Optional[str]
    amount: float
    status: str
    created_at: datetime

class UserManagementSchema(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    phone: Optional[str]
    role: UserRole
    vetting_status: VettingStatus
    profile_photo_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    total_count: int
    users: List[UserManagementSchema]

class AdminCreateUserRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=6)
    role: UserRole  # UserRole.NANNY or UserRole.FAMILY

class MatchClientSchema(BaseModel):
    name: str
    location: Optional[str] = "Nairobi"
    avatar_url: Optional[str]

class MatchNannySchema(BaseModel):
    name: str
    id_code: str # e.g., #MLK-94021

class MatchManagementSchema(BaseModel):
    id: UUID
    nanny: MatchNannySchema
    family: MatchClientSchema
    status: MatchStatus
    match_date: datetime

    class Config:
        from_attributes = True

class MatchListResponse(BaseModel):
    total_count: int
    active_count: int
    matches: List[MatchManagementSchema]


class ManualMatchRequest(BaseModel):
    family_id: UUID
    nanny_id: UUID

class PaymentMatchInfo(BaseModel):
    id: UUID
   

    class Config:
        from_attributes = True
        populate_by_name = True

class PaymentResponse(BaseModel):
    id: UUID
    created_at: datetime
    checkout_request_id: Optional[str]
    mpesa_transaction_code: Optional[str]
    amount: float
    payment_status: str
    family_name: Optional[str] = "Unknown Family"
    nanny_name: Optional[str] = "N/A (Direct Payment)"
    matches: List[PaymentMatchInfo] = []

    class Config:
        from_attributes = True

class PaymentDashboardStats(BaseModel):
    total_volume: float
    success_rate: float
    total_count: int

class PaymentListResponse(BaseModel):
    payments: List[PaymentResponse]
    stats: PaymentDashboardStats
    total_count: int

