"""자식 자체 SQLAlchemy AsyncSession 팩토리.

DATABASE_URL 환경변수 우선. 미설정 시 RuntimeError.
"""
import os
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = os.environ.get('DATABASE_URL', '')
_engine = create_async_engine(DATABASE_URL, echo=False) if DATABASE_URL else None
_SessionLocal = (
    async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    if _engine else None
)


async def get_db() -> AsyncIterator[AsyncSession]:
    if _SessionLocal is None:
        raise RuntimeError('DATABASE_URL 환경변수가 설정되지 않았습니다.')
    async with _SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
