from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String, unique=True, index=True, nullable=False)
    model = Column(String, nullable=False)
    type = Column(String, nullable=False)
    max_load_capacity = Column(Float, nullable=False)
    odometer = Column(Float, nullable=False, default=0.0)
    acquisition_cost = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="Available")
    region = Column(String, nullable=True)
