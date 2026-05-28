from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Query, Request, status
from pydantic import BaseModel

router = APIRouter(tags=["history"])


class MessageItem(BaseModel):
    id: int
    role: Literal["user", "assistant"]
    raw: str
    display: str
    modified_files: list[str] | None = None
    created_at: datetime


@router.get("/api/messages")
async def get_all_messages(
    request: Request,
    limit: int = Query(default=200, ge=1, le=500),
    before_id: int | None = Query(default=None),
) -> list[MessageItem]:
    history = request.app.state.chat_history
    rows = await history.get_all_messages(limit=limit, before_id=before_id)
    return [MessageItem(**r) for r in rows]


@router.delete("/api/messages", status_code=status.HTTP_204_NO_CONTENT)
async def clear_messages(request: Request) -> None:
    history = request.app.state.chat_history
    await history.clear_all()
