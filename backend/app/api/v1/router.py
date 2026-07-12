from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.vehicles import router as vehicles_router
from app.api.v1.drivers import router as drivers_router
from app.api.v1.trips import router as trips_router
from app.api.v1.maintenance import router as maintenance_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(vehicles_router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(drivers_router, prefix="/drivers", tags=["drivers"])
api_router.include_router(trips_router, prefix="/trips", tags=["trips"])
api_router.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
