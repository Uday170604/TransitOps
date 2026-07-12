from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.vehicles import router as vehicles_router
from app.api.v1.drivers import router as drivers_router
from app.api.v1.trips import router as trips_router
from app.api.v1.maintenance import router as maintenance_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.fuel_expenses import router as fuel_expenses_router
from app.api.v1.reports import router as reports_router
from app.api.v1.settings import router as settings_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(vehicles_router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(drivers_router, prefix="/drivers", tags=["drivers"])
api_router.include_router(trips_router, prefix="/trips", tags=["trips"])
api_router.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(fuel_expenses_router, prefix="", tags=["fuel-expenses"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
api_router.include_router(settings_router, prefix="/settings", tags=["settings"])
