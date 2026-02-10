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
        title="My API",
        version="1.0.0",
        description="NANNY LINK JWT Bearer token authentication",
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

APPLICATION_PORT = int(os.getenv("APPLICATION_PORT", 8000))
KEEP_ALIVE_INTERVAL = 240 

@asynccontextmanager
async def lifespan(app: FastAPI):    
    BASE_URL = os.getenv("BASE_URL")
    
    if not BASE_URL:
        logger.error("CRITICAL ERROR: BACKEND_BASE_URL environment variable is NOT set. Daraja integration requires a public URL.")
        raise RuntimeError("BACKEND_BASE_URL environment variable is required for Daraja integration.")

    # Execute production-specific setup
    BASE_URL = BASE_URL.rstrip('/')
    os.environ["DARAJA_CALLBACK_URL"] = f"{BASE_URL}/stkcallback"
    logger.info(f"Using Production Base URL: {BASE_URL}")
    logger.info(f"Daraja Callback URL set to: {os.environ['DARAJA_CALLBACK_URL']}")

    # 2. Start the keep-alive ping task
    keep_alive_task = asyncio.create_task(keep_alive_ping(os.environ["DARAJA_CALLBACK_URL"]))

    yield

    # 3. Handle graceful shutdown
    logger.info("Application shutdown initiated. Cancelling keep-alive task...")
    keep_alive_task.cancel()
    try:
        await keep_alive_task
    except asyncio.CancelledError:
        pass
    logger.info("Application shutdown complete.")

app = FastAPI(
    lifespan=lifespan,
    json_encoders={
        UUID: str 
    }
)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://nannylink-kenya.onrender.com",
    "http://127.0.0.1:5500"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
        

@app.post("/stkcallback")
async def daraja_callback(request: Request, db: SessionDep):
    try:
        raw_body = await request.body()
        callback_data = json.loads(raw_body.decode("utf-8"))
        logger.info(f"Received STK Callback: {json.dumps(callback_data, indent=2)}")

        service = PaymentService(db)
        result = await service.handle_stk_callback(callback_data)

        if not result.success:
            return {"ResultCode": 1, "ResultDesc": result.error}

        return {"ResultCode": 0, "ResultDesc": "Callback processed successfully."}

    except json.JSONDecodeError:
        logger.error("Invalid JSON payload in callback.")
        return {"ResultCode": 1, "ResultDesc": "Invalid JSON format"}
    except Exception as e:
        logger.error(f"Callback processing error: {e}", exc_info=True)
        return {"ResultCode": 1, "ResultDesc": f"Error: {str(e)}"}

app.openapi = custom_openapi