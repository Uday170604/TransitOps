from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from app.schemas.vehicle import VehicleResponse
from app.schemas.driver import DriverResponse

class TripBase(BaseModel):
    source: str
    destination: str
    vehicle_id: int
    driver_id: int
    cargo_weight: float = Field(..., gt=0)
    planned_distance: float = Field(..., gt=0)
    status: Literal["Draft", "Dispatched", "Completed", "Cancelled"] = "Draft"

class TripCreate(TripBase):
    pass

class TripStatusUpdate(BaseModel):
    status: Literal["Draft", "Dispatched", "Completed", "Cancelled"]
    current_odometer: Optional[float] = Field(None, ge=0)

class TripResponse(TripBase):
    id: int
    created_at: datetime
    updated_at: datetime
    vehicle: Optional[VehicleResponse] = None
    driver: Optional[DriverResponse] = None

    class Config:
        from_attributes = True
