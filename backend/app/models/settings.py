from sqlalchemy import Column, Integer, String
from app.database import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    depot_name = Column(String, default="Gandhinagar Depot GJ4", nullable=False)
    currency = Column(String, default="INR (Rs)", nullable=False)
    distance_unit = Column(String, default="Kilometers", nullable=False)
