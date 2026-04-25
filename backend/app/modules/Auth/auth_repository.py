from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
import uuid
from  app.modules.Auth.auth_schema  import UserCreate
from sqlalchemy.future import select
from typing import Optional

class AuthRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    # app/modules/Auth/auth_repository.py

    async def create_user(self, user_schema: UserCreate) -> User:
        # Convert Pydantic model to dict
        user_data = user_schema.model_dump()       
        new_user = User(**user_data) 
        
        return await self.save(new_user)
    
    async def get_user_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_user_by_phone(self, phone_number: str) -> User | None:
        stmt = select(User).where(User.phone == phone_number)
        results = await self.db.execute(stmt)
        return results.scalars().first()
    
    async def get_user_by_id(self, user_id: uuid.UUID) -> User | None:
        stmt = select(User).where(User.id == user_id)
        results = await self.db.execute(stmt)
        return results.scalars().first()

    # Add these methods to your AuthRepository class

    async def get_user_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def update_user_password(self, user_id: uuid.UUID, hashed_password: str) -> bool:
        try:
            result = await self.db.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
            if user:
                user.password = hashed_password
                await self.db.flush()
                return True
            return False
        except Exception:
            return False