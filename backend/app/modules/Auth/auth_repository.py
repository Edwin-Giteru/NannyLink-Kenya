from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
import uuid
from  app.modules.Auth.auth_schema  import UserCreate
from sqlalchemy.future import select

class AuthRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        return user

    async def create_user(self, user: UserCreate,) -> User:
        user = User(**user.model_dump())
        return await self.save(user)
    
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

