from app.utils.results import Result
from app.modules.Auth.auth_repository import AuthRepository
from app.modules.Auth.auth_schema import UserCreate, LoginRequest
from app.db.models.user import User
from app.db.models.types import UserRole
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    create_refresh_token,
)
from datetime import timedelta
from app.config.settings import settings
from fastapi.responses import JSONResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_repo = AuthRepository(db)
    
    async def register_nanny(self, user: UserCreate) -> Result:
        # Create Role 

        existing_user = await self.auth_repo.get_user_by_email(user.email)
        if existing_user:
            return Result.fail(
                "User with this email already exists.",
                status_code=400
            )
        existing_phone = await self.auth_repo.get_user_by_phone(user.phone)
        if existing_phone:
            return Result.fail(
                "User with this phone number already exists.",
                status_code=400
            )
        hashed_pass = hash_password(user.password)
        user.password = hashed_pass
        user.role = UserRole.NANNY
        
        new_user = await self.auth_repo.create_user(user)
        await self.db.commit()
        await self.db.refresh(new_user)
        
        return Result.ok(
            data=new_user,
            status_code=201
        )

    async def register_family(self, user: UserCreate) -> Result:
            # Create Role 

            existing_user = await self.auth_repo.get_user_by_email(user.email)
            if existing_user:
                return Result.fail(
                    "User with this email already exists.",
                    status_code=400
                )
            existing_phone = await self.auth_repo.get_user_by_phone(user.phone)
            if existing_phone:
                return Result.fail(
                    "User with this phone number already exists.",
                    status_code=400
                )
            hashed_pass = hash_password(user.password)
            user.password = hashed_pass
            user.role = UserRole.FAMILY
            
            new_user = await self.auth_repo.create_user(user)
            await self.db.commit()
            await self.db.refresh(new_user)
            
            return Result.ok(
                data=new_user,
                status_code=201
            )
    
    async def login_user(self, form_data: LoginRequest) -> Result:
        user = await self.auth_repo.get_user_by_email(form_data.email)
        if not user:
            return Result.fail("User with the email doesnot exist", status_code=401)
        if  not verify_password(form_data.password, user.password):
            return Result.fail("Invalid credentials", status_code=400)

        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email}, expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        user_data = {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "access_token": access_token,
        "refresh_token": refresh_token, # Send this so router can set cookie
        "token_type": "bearer"
    }
        return Result.ok(data=user_data, status_code=200)