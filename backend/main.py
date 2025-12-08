from fastapi import FastAPI
from app.modules.Auth.auth_controller import router as auth_router
from app.modules.Nanny.nanny_controller import router as nanny_router
from fastapi.security import OAuth2PasswordBearer

outh2scheme = OAuth2PasswordBearer(tokenUrl="Auth/login")

app = FastAPI()

app.include_router(auth_router)
app.include_router(nanny_router)

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
        
    openapi_schema = get_openapi(
        title="My API",
        version="1.0.0",
        description="DUKA YETU JWT Bearer token authentication",
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

app.openapi = custom_openapi