from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date
from app.schemas.vehicle import VehicleResponse

class MaintenanceLogBase(BaseModel):
    vehicle_id: int
    description: str
    start_date: date
    end_date: Optional[date] = None
    cost: Optional[float] = Field(None, ge=0)
    status: Literal["Active", "Closed"] = "Active"

class MaintenanceLogCreate(MaintenanceLogBase):
    pass

class MaintenanceLogClose(BaseModel):
    end_date: date
    cost: float = Field(..., ge=0)

class MaintenanceLogResponse(MaintenanceLogBase):
    id: int
    vehicle: Optional[VehicleResponse] = None

    class Config:
        from_attributes = True
