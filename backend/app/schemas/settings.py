from pydantic import BaseModel
from typing import Optional

class SettingsBase(BaseModel):
    depot_name: str
    currency: str
    distance_unit: str

class SettingsUpdate(BaseModel):
    depot_name: Optional[str] = None
    currency: Optional[str] = None
    distance_unit: Optional[str] = None

class SettingsResponse(SettingsBase):
    id: int

    class Config:
        from_attributes = True
