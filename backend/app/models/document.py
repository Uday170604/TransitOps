from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base

class VehicleDocument(Base):
    __tablename__ = "vehicle_documents"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    name = Column(String, nullable=False)
    document_type = Column(String, nullable=False)  # e.g., Insurance, Registration, PUC
    upload_date = Column(Date, nullable=False)
    file_content = Column(String, nullable=False)    # Base64 simulated file data

    vehicle = relationship("Vehicle")
