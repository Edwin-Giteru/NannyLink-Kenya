from fastapi import FastAPI
from app.modules import router
from app.modules.payments.service import PaymentService
from fastapi.security import OAuth2PasswordBearer
from fastapi import Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import SessionDep
import json
import logging
logger = logging.getLogger(__name__)

outh2scheme = OAuth2PasswordBearer(tokenUrl="Auth/login")

app = FastAPI()

app.include_router(router)

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