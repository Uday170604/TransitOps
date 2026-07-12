from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class FuelLogBase(BaseModel):
    vehicle_id: int
    liters: float = Field(..., gt=0)
    cost: float = Field(..., gt=0)
    date: date
    description: Optional[str] = None

class FuelLogCreate(FuelLogBase):
    pass

class FuelLogUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    liters: Optional[float] = Field(None, gt=0)
    cost: Optional[float] = Field(None, gt=0)
    date: Optional[date] = None
    description: Optional[str] = None

class FuelLogResponse(FuelLogBase):
    id: int

    class Config:
        from_attributes = True
