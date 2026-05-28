import asyncio
from unittest.mock import AsyncMock

from openbuddy.agent.lifecycle import AgentChunk
from openbuddy.events import EventBus
from openbuddy.voice import pipeline as pl
from openbuddy.voice.qwen import QwenCleanupError


async def _collect(bus: EventBus, captured: list, timeout: float = 0.5) -> None:
    async with bus.subscribe() as q:
        while True:
            try:
                captured.append(await asyncio.wait_for(q.get(), timeout))
            except TimeoutError:
                return


async def test_happy_path(monkeypatch):
    bus = EventBus()
    captured: list[dict] = []

    monkeypatch.setattr(pl, "transcribe", AsyncMock(return_value="原始口语"))
    monkeypatch.setattr(pl, "sanitize_transcript", lambda x: x)
    monkeypatch.setattr(pl, "cleanup_user_input", AsyncMock(return_value="书面"))
    monkeypatch.setattr(pl, "cleanup_assistant_text", AsyncMock(return_value="简化"))
    monkeypatch.setattr(pl, "synthesize", AsyncMock(return_value=b"pcmbytes"))

    class FakeAgent:
        async def ask(self, prompt: str, *, cwd: str, system_prompt: str | None = None):
            yield AgentChunk(text="好的，我现在就为您查看。")
            yield AgentChunk(modified_file="/tmp/test.py")

    class FakeKeys:
        def require(self, name):
            return f"key-{name.value}"

    collector = asyncio.create_task(_collect(bus, captured))
    await pl.run_pipeline(
        pcm=b"\x00" * 32000,
        cwd="/tmp",
        agent=FakeAgent(),
        keys=FakeKeys(),
        bus=bus,
    )
    await collector

    types = [m.get("type") for m in captured]
    assert "transcript" in types
    assert "assistant_text" in types
    # spoken_text 必须 publish — webui 据此显示 dashscope 口语化后的 TTS 朗读原文
    assert "spoken_text" in types
    spoken = next(m for m in captured if m.get("type") == "spoken_text")
    assert spoken["text"] == "简化"
    assert "tts_start" in types
    assert "tts_end" in types
    assert "error" not in types
    # tts_pcm carries bytes payload
    tts_pcm = next(m for m in captured if m.get("type") == "tts_pcm")
    assert tts_pcm["pcm"] == b"pcmbytes"
    # Chat events for webui
    assert "user_message" in types
    user_msg = next(m for m in captured if m.get("type") == "user_message")
    assert user_msg["raw"] == "原始口语"
    assert user_msg["cleaned"] == "书面"
    assert "agent_message" in types
    agent_msg = next(m for m in captured if m.get("type") == "agent_message")
    assert agent_msg["spoken"] == "简化"
    assert agent_msg["modified_files"] == ["/tmp/test.py"]


async def test_qwen_failure_publishes_error(monkeypatch):
    bus = EventBus()
    captured: list[dict] = []

    monkeypatch.setattr(pl, "transcribe", AsyncMock(return_value="text"))
    monkeypatch.setattr(pl, "sanitize_transcript", lambda x: x)
    monkeypatch.setattr(
        pl,
        "cleanup_user_input",
        AsyncMock(side_effect=QwenCleanupError("timeout")),
    )

    class FakeAgent:
        async def ask(self, prompt: str, *, cwd: str, system_prompt: str | None = None):
            yield AgentChunk(text="should not run")

    class FakeKeys:
        def require(self, name):
            return "k"

    collector = asyncio.create_task(_collect(bus, captured))
    await pl.run_pipeline(
        pcm=b"\x00" * 32000,
        cwd="/tmp",
        agent=FakeAgent(),
        keys=FakeKeys(),
        bus=bus,
    )
    await collector

    types = [m.get("type") for m in captured]
    assert "error" in types
    err = next(m for m in captured if m.get("type") == "error")
    assert err["code"] == "qwen_failure"
    # state error frame should also be published
    states = [m.get("state") for m in captured if m.get("type") == "state"]
    assert "error" in states
