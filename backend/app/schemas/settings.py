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

class RolePermissionResponse(BaseModel):
    id: int
    name: str
    permission_fleet: str
    permission_driver: str
    permission_trips: str
    permission_fuel: str
    permission_analytics: str

    class Config:
        from_attributes = True

class RolePermissionUpdate(BaseModel):
    id: int
    permission_fleet: str
    permission_driver: str
    permission_trips: str
    permission_fuel: str
    permission_analytics: str
