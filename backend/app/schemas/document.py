from pydantic import BaseModel
from datetime import date

class VehicleDocumentBase(BaseModel):
    name: str
    document_type: str
    upload_date: date

class VehicleDocumentCreate(VehicleDocumentBase):
    file_content: str  # Base64 simulated file data

class VehicleDocumentResponse(VehicleDocumentBase):
    id: int
    vehicle_id: int

    class Config:
        from_attributes = True
