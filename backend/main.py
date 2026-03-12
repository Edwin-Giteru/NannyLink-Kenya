from fastapi import FastAPI
from app.modules import router
from app.modules.payments.service import PaymentService
from fastapi.security import OAuth2PasswordBearer
from fastapi import Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import SessionDep
import os
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import httpx
from uuid import UUID
import json
import logging
logger = logging.getLogger(__name__)

outh2scheme = OAuth2PasswordBearer(tokenUrl="Auth/login")

from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
        
    openapi_schema = get_openapi(
        title="NannyLink API",
        version="1.0.0",
        description="Nanny Link API with selective JWT Auth",
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

APPLICATION_PORT = int(os.getenv("APPLICATION_PORT", 8000))
KEEP_ALIVE_INTERVAL = 240 

@asynccontextmanager
async def lifespan(app: FastAPI):    
    BASE_URL = os.getenv("BASE_URL")
    if not BASE_URL:
        raise RuntimeError("BASE_URL environment variable is required.")

    BASE_URL = BASE_URL.rstrip('/')
    # Match the log: Safaricom hits /payments/callback
    os.environ["DARAJA_CALLBACK_URL"] = f"{BASE_URL}/payments/callback"
    
    # Update health check URL for the ping task
    health_url = f"{BASE_URL}/payments/health"
    keep_alive_task = asyncio.create_task(keep_alive_ping(health_url))

    yield
    keep_alive_task.cancel()

app = FastAPI(
    lifespan=lifespan,
    json_encoders={
        UUID: str 
    }
)
# origins = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
#     "https://nannylink-kenya.onrender.com",
#     "http://127.0.0.1:5500"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

app.router.lifespan_context = lifespan 

async def keep_alive_ping(url: str):
    logger.info(f"Starting keep-alive ping to {url}")
    ping_url = url.rsplit("/", 1)[0] + "/health" 
    while True:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.get(ping_url)
                logger.debug(f"Keep-alive ping response: {res.status_code} for {ping_url}")
        except Exception as e:
            logger.warning(f"Keep-alive ping to {ping_url} failed: {e}")
        await asyncio.sleep(KEEP_ALIVE_INTERVAL)
        


app.openapi = custom_openapi