from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException
from app.modules.Auth.auth_service import AuthService
from app.modules.Auth.auth_schema import UserCreate, UserResponse
from app.utils.results import Result
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/user", response_model=UserResponse, status_code=201)
async def register_user(
    user: UserCreate,
    db: SessionDep
):
    try:
        auth_service = AuthService(db)
        result = await auth_service.register_user(user)
        
        if not result.success:
            return JSONResponse(
                status_code=result.status_code,
                content=result.to_dict()
            )
        
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))