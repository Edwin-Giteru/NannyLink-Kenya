from pydantic import BaseModel, EmailStr, Field
import uuid
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    phone: str
    password: str

    class Config:
        orm_mode = True

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None

    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    phone: Optional[str] = None
    role_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True