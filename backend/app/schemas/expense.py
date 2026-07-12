from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class ExpenseBase(BaseModel):
    vehicle_id: int
    description: str
    amount: float = Field(..., gt=0)
    date: date
    category: str = "other"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    date: Optional[date] = None
    category: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: int

    class Config:
        from_attributes = True
