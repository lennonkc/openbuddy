import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager


class EventBus:
    def __init__(self, capacity: int = 256) -> None:
        self._subs: set[asyncio.Queue] = set()
        self._capacity = capacity
        self.last_device_state: str = "disconnected"

    @asynccontextmanager
    async def subscribe(self) -> AsyncIterator[asyncio.Queue]:
        q: asyncio.Queue = asyncio.Queue(maxsize=self._capacity)
        self._subs.add(q)
        try:
            yield q
        finally:
            self._subs.discard(q)

    async def publish(self, msg: dict) -> None:
        if msg.get("type") == "state":
            self.last_device_state = msg["state"]
        for q in list(self._subs):
            while q.full():
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    break
            await q.put(msg)
