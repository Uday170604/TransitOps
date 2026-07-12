from sqlalchemy import Column, Integer, String
from app.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    permission_fleet = Column(String, default="none", nullable=False)
    permission_driver = Column(String, default="none", nullable=False)
    permission_trips = Column(String, default="none", nullable=False)
    permission_fuel = Column(String, default="none", nullable=False)
    permission_analytics = Column(String, default="none", nullable=False)
