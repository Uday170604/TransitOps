from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.role import Role

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    role_obj = relationship("Role")

    failed_login_attempts = Column(Integer, default=0, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)

