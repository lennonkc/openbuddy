import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from openbuddy.models import Base

log = logging.getLogger(__name__)


async def init_db(db_path: Path) -> tuple[AsyncEngine, async_sessionmaker]:
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        result = await conn.execute(text("PRAGMA table_info(messages)"))
        columns = {row[1] for row in result.fetchall()}
        if "modified_files" not in columns:
            await conn.execute(text("ALTER TABLE messages ADD COLUMN modified_files TEXT"))
    log.info("chat history DB ready at %s", db_path)
    return engine, async_sessionmaker(engine, expire_on_commit=False)
