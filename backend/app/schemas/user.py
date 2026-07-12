from typing import Generic, TypeVar, Optional, Literal
from pydantic import BaseModel, EmailStr

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    status_code: int
    message: str
    data: Optional[T] = None

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Literal["fleet_manager", "driver", "safety_officer", "financial_analyst"]

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

