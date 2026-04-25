import asyncio
from uuid import uuid4
from sqlalchemy import select

# Import your session maker directly
from app.db.session import async_session_maker 
from app.db.models.user import User
from app.db.models.types import UserRole
from app.utils.security import hash_password

async def seed_admin():
    # Use the session maker directly for standalone scripts
    async with async_session_maker() as session:
        email = "admin@gmail.com"
        
        # 1. Check if admin already exists
        result = await session.execute(select(User).where(User.email == email))
        existing_user = result.scalars().first()

        if existing_user:
            print(f"User {email} already exists. Skipping...")
            return

        # 2. Create the Admin record
        new_admin = User(
            id=uuid4(),
            email=email,
            phone="+254711223344",
            password=hash_password("admin123!"),
            role=UserRole.ADMIN
        )

        try:
            session.add(new_admin)
            await session.commit()
            print(f"Successfully created admin: {email}")
        except Exception as e:
            await session.rollback()
            print(f"Error seeding admin: {e}")

if __name__ == "__main__":
    asyncio.run(seed_admin())