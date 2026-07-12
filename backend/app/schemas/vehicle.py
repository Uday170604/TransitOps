from pydantic import BaseModel, Field
from typing import Optional, Literal

class VehicleBase(BaseModel):
    registration_number: str
    model: str
    type: str
    max_load_capacity: float = Field(..., gt=0)
    odometer: float = Field(default=0.0, ge=0)
    acquisition_cost: float = Field(..., ge=0)
    status: Literal["Available", "On Trip", "In Shop", "Retired"] = "Available"

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    model: Optional[str] = None
    type: Optional[str] = None
    max_load_capacity: Optional[float] = Field(None, gt=0)
    odometer: Optional[float] = Field(None, ge=0)
    acquisition_cost: Optional[float] = Field(None, ge=0)
    status: Optional[Literal["Available", "On Trip", "In Shop", "Retired"]] = None

class VehicleResponse(VehicleBase):
    id: int

    class Config:
        from_attributes = True
