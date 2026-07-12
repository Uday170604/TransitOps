from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.router import api_router
from app.api.v1.auth import router as auth_router

app = FastAPI(
    title="TransitOps API",
    description="Backend API for TransitOps transport operations platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status_code": exc.status_code,
            "message": exc.detail,
            "data": None,
            "detail": exc.detail
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    err_messages = []
    for err in errors:
        loc = ".".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Validation error")
        err_messages.append(f"{loc}: {msg}")
    
    summary_message = "Validation error: " + "; ".join(err_messages)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "message": summary_message,
            "data": errors,
            "detail": summary_message
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    message = str(exc) or "Internal Server Error"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "message": "An unexpected error occurred.",
            "data": None,
            "detail": message
        }
    )

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "success": True,
        "status_code": 200,
        "message": "Welcome to TransitOps API",
        "data": {
            "app": "TransitOps Backend",
            "version": "1.0.0"
        }
    }
