import asyncio

from openbuddy.events import EventBus


async def test_subscriber_receives_published():
    bus = EventBus()
    async with bus.subscribe() as q:
        await bus.publish({"type": "hello"})
        msg = await asyncio.wait_for(q.get(), timeout=0.5)
        assert msg == {"type": "hello"}


async def test_multiple_subscribers_each_get_message():
    bus = EventBus()
    async with bus.subscribe() as q1, bus.subscribe() as q2:
        await bus.publish({"x": 1})
        assert await asyncio.wait_for(q1.get(), 0.5) == {"x": 1}
        assert await asyncio.wait_for(q2.get(), 0.5) == {"x": 1}


async def test_full_queue_drops_oldest():
    bus = EventBus(capacity=2)
    async with bus.subscribe() as q:
        for i in range(5):
            await bus.publish({"i": i})
        items = []
        while not q.empty():
            items.append(await q.get())
        assert items[-1] == {"i": 4}
        assert len(items) == 2
