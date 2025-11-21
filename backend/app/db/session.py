from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, AsyncGenerator
from .db_conn import async_session_maker

# Dependency to get database session for FastAPI
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


SessionDep = Annotated[AsyncSession, Depends(get_session)]