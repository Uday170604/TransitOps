from pydantic import BaseModel, Field
from datetime import date

class ExpenseBase(BaseModel):
    vehicle_id: int
    description: str
    amount: float = Field(..., gt=0)
    date: date
    category: str = "other"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int

    class Config:
        from_attributes = True
