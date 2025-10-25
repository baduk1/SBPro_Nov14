from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    role: UserRole
    email_verified: bool
    credits_balance: int
    full_name: Optional[str] = None


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
