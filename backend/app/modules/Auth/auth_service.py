from app.utils.results import Result
from app.modules.Auth.auth_repository import AuthRepository
from app.modules.Auth.auth_schema import UserCreate
from app.db.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.security import hash_password

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_repo = AuthRepository(db)
    
    async def register_user(self, user: UserCreate) -> Result:
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
        
        new_user = await self.auth_repo.create_user(user)
        return Result.ok(
            data=new_user,
            status_code=201
        )
    

        
