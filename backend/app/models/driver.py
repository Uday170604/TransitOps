from sqlalchemy import Column, Integer, String, Float, Date
from app.database import Base

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    license_number = Column(String, unique=True, index=True, nullable=False)
    license_category = Column(String, nullable=False)
    license_expiry_date = Column(Date, nullable=False)
    contact_number = Column(String, nullable=False)
    safety_score = Column(Float, nullable=False, default=100.0)
    status = Column(String, nullable=False, default="Available")
    email = Column(String, unique=True, index=True, nullable=True)
    
    trip_completion_rate = Column(Float, default=90.0, nullable=False)
    safety_status = Column(String, default="Available", nullable=False)
