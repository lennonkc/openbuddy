import pytest

from openbuddy.db import init_db
from openbuddy.history import ChatHistory


@pytest.fixture
async def history(tmp_path):
    engine, sf = await init_db(tmp_path / "test.db")
    h = ChatHistory(sf)
    await h.init()
    yield h
    await engine.dispose()


async def test_start_conversation(history: ChatHistory):
    conv_id = await history.start_conversation("Cardputer")
    assert conv_id is not None
    assert await history.get_current_conversation_id() == conv_id


async def test_save_user_message_into_started_conversation(history: ChatHistory):
    conv_id = await history.start_conversation("Device")
    conv_id2, msg_id = await history.save_user_message(raw="hello raw", display="hello clean")
    assert conv_id2 == conv_id
    assert msg_id >= 1

    msgs = await history.get_all_messages()
    assert len(msgs) == 1
    assert msgs[0]["role"] == "user"
    assert msgs[0]["raw"] == "hello raw"


async def test_save_user_message_auto_creates_if_no_conversation(history: ChatHistory):
    conv_id, msg_id = await history.save_user_message(raw="hi", display="hi")
    assert conv_id is not None
    assert msg_id >= 1


async def test_save_assistant_message_appends(history: ChatHistory):
    await history.start_conversation("Device")
    conv_id, _ = await history.save_user_message(raw="hi", display="hi")
    conv_id2, _ = await history.save_assistant_message(
        raw="response", display="spoken response"
    )
    assert conv_id2 == conv_id

    msgs = await history.get_all_messages()
    assert len(msgs) == 2
    assert msgs[1]["role"] == "assistant"


async def test_new_device_connection_creates_new_conversation(history: ChatHistory):
    conv1 = await history.start_conversation("Cardputer")
    await history.save_user_message(raw="a", display="a")

    conv2 = await history.start_conversation("Cardputer")
    await history.save_user_message(raw="b", display="b")

    assert conv1 != conv2

    msgs = await history.get_all_messages()
    assert len(msgs) == 2


async def test_title_truncation(history: ChatHistory):
    long_title = "x" * 100
    conv_id = await history.start_conversation(long_title)
    assert conv_id is not None


async def test_get_all_messages_across_conversations(history: ChatHistory):
    await history.start_conversation("Session 1")
    await history.save_user_message(raw="msg1", display="msg1")
    await history.save_assistant_message(raw="reply1", display="reply1")

    await history.start_conversation("Session 2")
    await history.save_user_message(raw="msg2", display="msg2")

    msgs = await history.get_all_messages()
    assert len(msgs) == 3
    assert msgs[0]["raw"] == "msg1"
    assert msgs[2]["raw"] == "msg2"


async def test_get_all_messages_pagination(history: ChatHistory):
    await history.start_conversation("Session")
    for i in range(5):
        await history.save_user_message(raw=f"msg{i}", display=f"msg{i}")

    msgs = await history.get_all_messages(limit=3)
    assert len(msgs) == 3

    msgs2 = await history.get_all_messages(limit=3, before_id=msgs[2]["id"])
    assert len(msgs2) == 2


async def test_clear_all(history: ChatHistory):
    await history.start_conversation("S1")
    await history.save_user_message(raw="x", display="x")
    await history.start_conversation("S2")
    await history.save_user_message(raw="y", display="y")

    await history.clear_all()

    assert await history.get_current_conversation_id() is None
    assert await history.get_all_messages() == []
