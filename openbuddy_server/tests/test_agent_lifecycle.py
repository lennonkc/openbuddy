import os
from unittest.mock import AsyncMock, MagicMock

import pytest
from claude_agent_sdk import AssistantMessage, SystemMessage, TextBlock, ToolUseBlock

import openbuddy.agent.lifecycle as lc


@pytest.fixture
def fake_sdk(monkeypatch):
    fake_client = MagicMock()
    fake_client.disconnect = AsyncMock()
    fake_client.connect = AsyncMock()
    factory = MagicMock(return_value=fake_client)
    monkeypatch.setattr(lc, "ClaudeSDKClient", factory)
    return factory, fake_client


async def test_first_call_creates_client_and_injects_env(fake_sdk, monkeypatch):
    factory, _ = fake_sdk
    monkeypatch.delenv("ANTHROPIC_BASE_URL", raising=False)
    mgr = lc.AgentManager(llm_config_getter=lambda: {"api_key": "mm-key", "base_url": "https://api.minimaxi.com/anthropic", "model": "MiniMax-M2.7"})
    await mgr.ensure(cwd="/tmp")
    assert factory.call_count == 1
    assert os.environ["ANTHROPIC_BASE_URL"] == "https://api.minimaxi.com/anthropic"


async def test_cwd_change_disconnects_old_and_rebuilds(fake_sdk):
    factory, client = fake_sdk
    mgr = lc.AgentManager(llm_config_getter=lambda: {"api_key": "mm-key", "base_url": "https://api.minimaxi.com/anthropic", "model": "MiniMax-M2.7"})
    await mgr.ensure(cwd="/tmp/a")
    await mgr.ensure(cwd="/tmp/b")
    assert factory.call_count == 2
    client.disconnect.assert_awaited()


async def test_same_cwd_reuses_client(fake_sdk):
    factory, _ = fake_sdk
    mgr = lc.AgentManager(llm_config_getter=lambda: {"api_key": "mm-key", "base_url": "https://api.minimaxi.com/anthropic", "model": "MiniMax-M2.7"})
    await mgr.ensure(cwd="/tmp")
    await mgr.ensure(cwd="/tmp")
    assert factory.call_count == 1


async def test_ask_extracts_text_blocks_from_assistant_messages(fake_sdk):
    """Regression: AssistantMessage.content is list[ContentBlock] — must
    iterate and pick TextBlock.text. Old code yielded nothing because the
    content was a list, not a str."""
    _, client = fake_sdk
    client.query = AsyncMock()

    async def fake_stream():
        # Mixed stream: system metadata, assistant text in 2 blocks, tool use, more text.
        yield SystemMessage(subtype="init", data={})
        yield AssistantMessage(
            content=[TextBlock(text="你好，"), TextBlock(text="当前目录是 /tmp。")],
            model="MiniMax-M2.7",
        )
        yield AssistantMessage(
            content=[ToolUseBlock(id="t1", name="Bash", input={})],
            model="MiniMax-M2.7",
        )
        yield AssistantMessage(
            content=[TextBlock(text="完成。")],
            model="MiniMax-M2.7",
        )

    client.receive_response = MagicMock(return_value=fake_stream())

    mgr = lc.AgentManager(llm_config_getter=lambda: {"api_key": "mm-key", "base_url": "https://api.minimaxi.com/anthropic", "model": "MiniMax-M2.7"})
    chunks = [c async for c in mgr.ask("foo", cwd="/tmp")]
    texts = [c.text for c in chunks if c.text]
    assert texts == ["你好，", "当前目录是 /tmp。", "完成。"]


async def test_ask_yields_nothing_when_only_non_text_blocks(fake_sdk):
    _, client = fake_sdk
    client.query = AsyncMock()

    async def fake_stream():
        yield SystemMessage(subtype="init", data={})
        yield AssistantMessage(
            content=[ToolUseBlock(id="t1", name="Bash", input={})],
            model="MiniMax-M2.7",
        )

    client.receive_response = MagicMock(return_value=fake_stream())

    mgr = lc.AgentManager(llm_config_getter=lambda: {"api_key": "mm-key", "base_url": "https://api.minimaxi.com/anthropic", "model": "MiniMax-M2.7"})
    chunks = [c async for c in mgr.ask("foo", cwd="/tmp")]
    assert chunks == []


async def test_ask_captures_modified_files_from_write_and_edit(fake_sdk):
    _, client = fake_sdk
    client.query = AsyncMock()

    write_input = {
        "file_path": "/tmp/hello.py",
        "content": "print('hi')",
    }
    edit_input = {
        "file_path": "/tmp/hello.py",
        "old_string": "hi",
        "new_string": "hello",
    }

    async def fake_stream():
        yield AssistantMessage(
            content=[TextBlock(text="I'll create the file.")],
            model="MiniMax-M2.7",
        )
        yield AssistantMessage(
            content=[ToolUseBlock(id="t1", name="Write", input=write_input)],
            model="MiniMax-M2.7",
        )
        yield AssistantMessage(
            content=[ToolUseBlock(id="t2", name="Edit", input=edit_input)],
            model="MiniMax-M2.7",
        )
        yield AssistantMessage(
            content=[
                ToolUseBlock(
                    id="t3",
                    name="Bash",
                    input={"command": "python /tmp/hello.py"},
                )
            ],
            model="MiniMax-M2.7",
        )
        yield AssistantMessage(
            content=[TextBlock(text="Done.")],
            model="MiniMax-M2.7",
        )

    client.receive_response = MagicMock(return_value=fake_stream())

    cfg = {
        "api_key": "mm-key",
        "base_url": "https://api.minimaxi.com/anthropic",
        "model": "MiniMax-M2.7",
    }
    mgr = lc.AgentManager(llm_config_getter=lambda: cfg)
    chunks = [c async for c in mgr.ask("foo", cwd="/tmp")]
    texts = [c.text for c in chunks if c.text]
    files = [c.modified_file for c in chunks if c.modified_file]
    assert texts == ["I'll create the file.", "Done."]
    assert files == ["/tmp/hello.py", "/tmp/hello.py"]
