import httpx
import pytest
import respx
from httpx import Response

from openbuddy.voice.qwen import (
    QwenCleanupError,
    cleanup_assistant_text,
    cleanup_user_input,
)


def _resp(text: str) -> Response:
    return Response(
        200,
        json={
            "id": "x",
            "type": "message",
            "role": "assistant",
            "content": [{"type": "text", "text": text}],
            "model": "qwen3.6-flash",
            "stop_reason": "end_turn",
            "stop_sequence": None,
            "usage": {"input_tokens": 1, "output_tokens": 1},
        },
    )


@respx.mock
async def test_cleanup_user_input_returns_cleaned():
    respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        return_value=_resp("我想问你能不能帮我看一下")
    )
    out = await cleanup_user_input(
        "我刚才说的就是想问一下你能不能帮我看看",
        api_key="sk-dashscope",
    )
    assert out == "我想问你能不能帮我看一下"


@respx.mock
async def test_cleanup_assistant_text_returns_cleaned():
    respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        return_value=_resp("好，我马上看下。")
    )
    out = await cleanup_assistant_text(
        "好的，请稍等一下，我现在就为您查看相关的内容。",
        api_key="sk-dashscope",
    )
    assert out == "好，我马上看下。"


@respx.mock
async def test_retries_once_on_timeout():
    route = respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        side_effect=[httpx.TimeoutException("t"), _resp("ok")]
    )
    out = await cleanup_user_input("hi", api_key="sk-dashscope")
    assert out == "ok"
    assert route.call_count == 2


@respx.mock
async def test_raises_after_second_failure():
    respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        side_effect=httpx.TimeoutException("t")
    )
    with pytest.raises(QwenCleanupError):
        await cleanup_user_input("hi", api_key="sk-dashscope")


@respx.mock
async def test_custom_system_overrides_default():
    route = respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        return_value=_resp("custom result")
    )
    out = await cleanup_user_input("hi", api_key="sk-dashscope", custom_system="my custom prompt")
    assert out == "custom result"
    sent_body = route.calls.last.request.read().decode()
    assert "my custom prompt" in sent_body


@respx.mock
async def test_chinese_input_uses_zh_system_prompt():
    route = respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        return_value=_resp("cleaned")
    )
    await cleanup_user_input("你好世界", api_key="sk-dashscope")
    sent_body = route.calls.last.request.read().decode()
    assert "文本风格化" in sent_body


@respx.mock
async def test_english_input_uses_en_system_prompt():
    route = respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        return_value=_resp("cleaned")
    )
    await cleanup_user_input("hello world", api_key="sk-dashscope")
    sent_body = route.calls.last.request.read().decode()
    assert "text normalizer" in sent_body


@respx.mock
async def test_assistant_chinese_uses_zh_system_prompt():
    route = respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        return_value=_resp("compressed")
    )
    await cleanup_assistant_text("这是一段中文回复", api_key="sk-dashscope")
    sent_body = route.calls.last.request.read().decode()
    assert "文本压缩" in sent_body


@respx.mock
async def test_assistant_english_uses_en_system_prompt():
    route = respx.post("https://dashscope.aliyuncs.com/apps/anthropic/v1/messages").mock(
        return_value=_resp("compressed")
    )
    await cleanup_assistant_text("This is an English reply", api_key="sk-dashscope")
    sent_body = route.calls.last.request.read().decode()
    assert "text compressor" in sent_body
