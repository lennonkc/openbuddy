from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from openbuddy.models import Conversation, Message

log = logging.getLogger(__name__)

TITLE_MAX_LEN = 50


class ChatHistory:
    def __init__(self, session_factory: async_sessionmaker) -> None:
        self._sf = session_factory
        self._current_conv_id: str | None = None

    async def init(self) -> None:
        async with self._sf() as session:
            stmt = select(Conversation.id).order_by(Conversation.updated_at.desc()).limit(1)
            result = await session.execute(stmt)
            self._current_conv_id = result.scalar_one_or_none()

    async def start_conversation(self, title: str = "Session") -> str:
        now = datetime.now(UTC)
        conv_id = uuid4().hex
        display_title = title[:TITLE_MAX_LEN] + ("…" if len(title) > TITLE_MAX_LEN else "")
        async with self._sf() as session:
            session.add(
                Conversation(id=conv_id, title=display_title, created_at=now, updated_at=now)
            )
            await session.commit()
        self._current_conv_id = conv_id
        return conv_id

    async def save_user_message(self, raw: str, display: str) -> tuple[str, int]:
        if self._current_conv_id is None:
            await self.start_conversation()
        conv_id = self._current_conv_id
        now = datetime.now(UTC)
        async with self._sf() as session:
            msg = Message(
                conversation_id=conv_id, role="user", raw=raw, display=display, created_at=now
            )
            session.add(msg)
            conv = await session.get(Conversation, conv_id)
            conv.updated_at = now
            await session.commit()
            await session.refresh(msg)
            return conv_id, msg.id

    async def save_assistant_message(
        self,
        raw: str,
        display: str,
        modified_files: list[str] | None = None,
    ) -> tuple[str, int]:
        if self._current_conv_id is None:
            await self.start_conversation()
        conv_id = self._current_conv_id
        now = datetime.now(UTC)
        async with self._sf() as session:
            msg = Message(
                conversation_id=conv_id,
                role="assistant",
                raw=raw,
                display=display,
                modified_files=json.dumps(modified_files) if modified_files else None,
                created_at=now,
            )
            session.add(msg)
            conv = await session.get(Conversation, conv_id)
            conv.updated_at = now
            await session.commit()
            await session.refresh(msg)
            return conv_id, msg.id

    async def get_all_messages(self, limit: int = 200, before_id: int | None = None) -> list[dict]:
        async with self._sf() as session:
            stmt = select(Message).order_by(Message.id.asc()).limit(limit)
            if before_id is not None:
                stmt = stmt.where(Message.id < before_id)
            msgs = (await session.execute(stmt)).scalars().all()
            return [
                {
                    "id": m.id,
                    "role": m.role,
                    "raw": m.raw,
                    "display": m.display,
                    "modified_files": json.loads(m.modified_files) if m.modified_files else None,
                    "created_at": m.created_at.isoformat(),
                }
                for m in msgs
            ]

    async def clear_all(self) -> None:
        async with self._sf() as session:
            await session.execute(delete(Message))
            await session.execute(delete(Conversation))
            await session.commit()
        self._current_conv_id = None

    async def get_current_conversation_id(self) -> str | None:
        return self._current_conv_id
