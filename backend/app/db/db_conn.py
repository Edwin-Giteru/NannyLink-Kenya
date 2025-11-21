from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")
# print(f"🔍 DATABASE_URL loaded: {DATABASE_URL[:50]}...")

# Clean up URL for asyncpg - remove unsupported parameters
if DATABASE_URL and "sslmode=" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")
    DATABASE_URL = DATABASE_URL.replace("&channel_binding=require", "")

# Ensure async driver
if DATABASE_URL and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine for PostgreSQL
try:
    async_engine = create_async_engine(
        DATABASE_URL,
        echo=False,  # False in production
        pool_pre_ping=True,
        pool_recycle=300,
        # SSL settings for Neon (alternative approach)
        # connect_args={
        #     "ssl": "require",
        #     "server_settings": {
        #         "jit": "off",
        #     },
        # }
    )
except Exception as e:
    print(f"❌ Failed to create async engine: {e}")
    raise

# Create a sessionmaker that will produce AsyncSession objects
async_session_maker = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)