import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

logger = logging.getLogger("devpulse.database")

Base = declarative_base()

# Primary Engine initialization with SQLite fallback
primary_url = settings.DATABASE_URL
engine = None
async_session_factory = None

try:
    engine = create_async_engine(
        primary_url,
        echo=False,
        future=True,
        pool_pre_ping=True,
    )
    async_session_factory = async_sessionmaker(
        engine, 
        class_=AsyncSession, 
        expire_on_commit=False
    )
except Exception as e:
    logger.warning(f"Could not initialize primary database engine ({primary_url}): {e}. Falling back to SQLite.")
    engine = create_async_engine(
        settings.SQLITE_URL,
        echo=False,
        future=True,
    )
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initializes tables and seeds initial telemetry data."""
    global engine, async_session_factory
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to connect to primary DB ({primary_url}): {e}. Initializing SQLite fallback.")
        engine = create_async_engine(settings.SQLITE_URL, echo=False, future=True)
        async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite fallback schema initialized successfully.")

    # Seed data if empty
    from app.seed_data import seed_initial_logs
    async with async_session_factory() as session:
        await seed_initial_logs(session)
