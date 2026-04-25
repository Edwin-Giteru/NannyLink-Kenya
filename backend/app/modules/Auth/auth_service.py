import uuid
import logging
import secrets
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.utils.results import Result
from app.modules.Auth.auth_repository import AuthRepository
from app.modules.Auth.auth_schema import UserCreate, LoginRequest
from app.db.models.user import User
from app.db.models.types import UserRole
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.config.settings import settings  # Only one settings import
from app.utils.email_service import EmailService

logger = logging.getLogger(__name__)

# Store reset tokens in memory
reset_tokens: dict = {}

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_repo = AuthRepository(db)
    
    async def register_nanny(self, user: UserCreate) -> Result:
        try:
            if await self.auth_repo.get_user_by_email(user.email):
                return Result.fail("Email already exists.", status_code=400)
            
            hashed_pass = hash_password(user.password)
            user_data = user.model_dump()
            user_data["password"] = hashed_pass
            user_data["role"] = UserRole.NANNY
            
            new_user = User(**user_data)
            self.db.add(new_user)
            await self.db.commit()
            await self.db.refresh(new_user)
            
            return Result.ok(data=new_user, status_code=201)
        except Exception as e:
            await self.db.rollback()
            print(f"DEBUG ERROR: {str(e)}") 
            return Result.fail(f"Internal Database Error: {str(e)}", status_code=500)

    async def register_family(self, user: UserCreate) -> Result:
        try:
            existing_user = await self.auth_repo.get_user_by_email(user.email)
            if existing_user:
                return Result.fail("User with this email already exists.", status_code=400)
            
            existing_phone = await self.auth_repo.get_user_by_phone(user.phone)
            if existing_phone:
                return Result.fail("User with this phone number already exists.", status_code=400)
            
            hashed_pass = hash_password(user.password)
            user.password = hashed_pass
            user.role = UserRole.FAMILY
            
            new_user = await self.auth_repo.create_user(user)
            await self.db.commit()
            await self.db.refresh(new_user)
            
            return Result.ok(data=new_user, status_code=201)
        except Exception as e:
            await self.db.rollback()
            return Result.fail(f"Registration failed: {str(e)}", status_code=500)
    
    async def login_user(self, form_data: LoginRequest) -> Result:
        user = await self.auth_repo.get_user_by_email(form_data.email)
        if not user:
            return Result.fail("User with this email does not exist", status_code=401)
        
        if not verify_password(form_data.password, user.password):
            return Result.fail("Invalid credentials", status_code=400)

        token_payload = {
            "sub": str(user.id), 
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role)
        }

        access_token = create_access_token(
            data=token_payload, 
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        refresh_token = create_refresh_token(
            data=token_payload, 
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )

        user_data = {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "access_token": access_token,
            "refresh_token": refresh_token, 
            "token_type": "bearer"
        }
        return Result.ok(data=user_data, status_code=200)
    
    async def request_password_reset(self, email: str) -> Result:
        """Generate a password reset token and send email"""
        try:
            user = await self.auth_repo.get_user_by_email(email)
            if not user:
                return Result.ok(data={"message": "If your email is registered, you will receive a reset link."})
            
            token = secrets.token_urlsafe(32)
            
            reset_tokens[token] = {
                "user_id": str(user.id),
                "expires_at": datetime.utcnow() + timedelta(minutes=30)
            }
            
            # Print to console for debugging
            reset_link = f"{settings.FRONTEND_URL}/views/reset-password.html?token={token}"
            print("\n" + "="*60)
            print(f"PASSWORD RESET LINK FOR {email}:")
            print(reset_link)
            print("="*60 + "\n")
            
            # Try to send email
            try:
                email_sent = await EmailService.send_password_reset_email(email, token)
                if email_sent:
                    return Result.ok(data={"message": "Password reset link has been sent to your email."})
                else:
                    return Result.ok(data={"message": "Check the console for the reset link (development mode)."})
            except Exception as e:
                logger.warning(f"Email sending failed: {e}")
                return Result.ok(data={"message": "Check the console for the reset link (development mode)."})
                
        except Exception as e:
            logger.error(f"Password reset request error: {str(e)}")
            return Result.fail(f"Failed to process reset request", status_code=500)
        
    async def confirm_password_reset(self, token: str, new_password: str) -> Result:
        """Validate token and update password"""
        try:
            token_data = reset_tokens.get(token)
            if not token_data:
                return Result.fail("Invalid or expired reset token", status_code=400)
            
            if datetime.utcnow() > token_data["expires_at"]:
                del reset_tokens[token]
                return Result.fail("Reset token has expired. Please request a new one.", status_code=400)
            
            hashed_password = hash_password(new_password)
            user_id = uuid.UUID(token_data["user_id"])
            success = await self.auth_repo.update_user_password(user_id, hashed_password)
            
            if success:
                del reset_tokens[token]
                await self.db.commit()
                return Result.ok(data={"message": "Password has been reset successfully"})
            else:
                return Result.fail("User not found", status_code=404)
                
        except Exception as e:
            await self.db.rollback()
            return Result.fail(f"Failed to reset password: {str(e)}", status_code=500)