from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException
from app.modules.Auth.auth_service import AuthService
from app.modules.Auth.auth_schema import UserCreate, UserResponse, LoginRequest
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Auth"])

@router.post("/nanny", response_model=UserResponse, status_code=201)
async def register_nanny(
    user: UserCreate,
    db: SessionDep
):
    try:
        auth_service = AuthService(db)
        result = await auth_service.register_nanny(user)
        
        if not result.success:
            return JSONResponse(
                status_code=result.status_code,
                content=result.to_dict()
            )        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/family", response_model=UserResponse, status_code=201)
async def register_family(
    user: UserCreate,
    db: SessionDep
):
    try:
        auth_service = AuthService(db)
        result = await auth_service.register_family(user)
        
        if not result.success:
            return JSONResponse(
                status_code=result.status_code,
                content=result.to_dict()
            )        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/login")
async def login(
    login_request: LoginRequest,
    db: SessionDep
):
    try:
        auth_service = AuthService(db)
        result = await auth_service.login_user(login_request)
        
        if not result.success:
            return JSONResponse(
                status_code=result.status_code,
                content=result.to_dict()
            )        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))