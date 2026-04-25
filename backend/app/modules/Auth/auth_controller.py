from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException
from app.modules.Auth.auth_service import AuthService
from app.modules.Auth.auth_schema import UserCreate, UserResponse, LoginRequest
from fastapi.responses import JSONResponse
from app.modules.Auth.auth_schema import PasswordResetRequest, PasswordResetConfirm


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
            raise HTTPException(
                status_code=result.status_code,
                detail=result.error
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
            raise HTTPException(
                status_code=result.status_code,
                detail=result.error
            )        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/login")
async def login(login_request: LoginRequest, db: SessionDep):
    try:
        auth_service = AuthService(db)
        result = await auth_service.login_user(login_request)
        
        if not result.success:
            raise HTTPException(
                status_code=result.status_code, 
                detail=result.error
            )
        
        # If we get here, result.success is True
        response = JSONResponse(content={
            "id": result.data["id"],
            "email": result.data["email"],
            "role": result.data["role"],
            "access_token": result.data["access_token"],
            "token_type": "bearer"           
        })

        return response
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/password-reset/request")
async def request_password_reset(
    request: PasswordResetRequest,
    db: SessionDep
):
    """Request a password reset link"""
    try:
        auth_service = AuthService(db)
        result = await auth_service.request_password_reset(request.email)
        
        if not result.success:
            raise HTTPException(
                status_code=result.status_code,
                detail=result.error
            )
        return result.data
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/password-reset/confirm")
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: SessionDep
):
    """Confirm password reset with token"""
    try:
        auth_service = AuthService(db)
        result = await auth_service.confirm_password_reset(request.token, request.new_password)
        
        if not result.success:
            raise HTTPException(
                status_code=result.status_code,
                detail=result.error
            )
        return result.data
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))