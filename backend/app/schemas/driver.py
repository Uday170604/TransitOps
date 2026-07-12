from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date

class DriverBase(BaseModel):
    name: str
    license_number: str
    license_category: str
    license_expiry_date: date
    contact_number: str
    safety_score: float = Field(default=100.0, ge=0, le=100)
    status: Literal["Available", "On Trip", "Off Duty", "Suspended"] = "Available"
    email: Optional[str] = None
    trip_completion_rate: Optional[float] = 90.0
    safety_status: Optional[str] = "Available"

class DriverCreate(DriverBase):
    pass

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    license_number: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry_date: Optional[date] = None
    contact_number: Optional[str] = None
    safety_score: Optional[float] = Field(None, ge=0, le=100)
    status: Optional[Literal["Available", "On Trip", "Off Duty", "Suspended"]] = None
    email: Optional[str] = None
    trip_completion_rate: Optional[float] = None
    safety_status: Optional[str] = None

class DriverResponse(DriverBase):
    id: int

    class Config:
        from_attributes = True
