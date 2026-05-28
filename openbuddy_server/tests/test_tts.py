import pytest
import respx
from httpx import Response

from openbuddy.voice.tts import (
    VOICE_ID_EN,
    VOICE_ID_ZH,
    ElevenLabsTTSError,
    _pick_voice,
    synthesize,
)

TTS_URL_PATTERN = "https://api.elevenlabs.io/v1/text-to-speech/"


@respx.mock
async def test_synthesize_concatenates_pcm_chunks():
    respx.post(url__startswith=TTS_URL_PATTERN).mock(
        return_value=Response(200, content=b"\x01\x02\x03\x04\x05\x06")
    )
    pcm = await synthesize("你好", api_key="xi-key")
    assert pcm == b"\x01\x02\x03\x04\x05\x06"


@respx.mock
async def test_synthesize_sends_correct_params():
    route = respx.post(url__startswith=TTS_URL_PATTERN).mock(
        return_value=Response(200, content=b"\x00\x01")
    )
    await synthesize("hello world", api_key="xi-key")
    req = route.calls.last.request
    assert "xi-api-key" in req.headers
    assert req.headers["xi-api-key"] == "xi-key"
    url = str(req.url)
    assert f"/text-to-speech/{VOICE_ID_EN}/stream" in url
    assert "output_format=pcm_16000" in url


@respx.mock
async def test_synthesize_uses_zh_voice_for_chinese():
    route = respx.post(url__startswith=TTS_URL_PATTERN).mock(
        return_value=Response(200, content=b"\x00\x01")
    )
    await synthesize("今天天气不错", api_key="xi-key")
    url = str(route.calls.last.request.url)
    assert f"/text-to-speech/{VOICE_ID_ZH}/stream" in url


@respx.mock
async def test_synthesize_uses_en_voice_for_english():
    route = respx.post(url__startswith=TTS_URL_PATTERN).mock(
        return_value=Response(200, content=b"\x00\x01")
    )
    await synthesize("good morning", api_key="xi-key")
    url = str(route.calls.last.request.url)
    assert f"/text-to-speech/{VOICE_ID_EN}/stream" in url


@respx.mock
async def test_synthesize_raises_on_http_error():
    respx.post(url__startswith=TTS_URL_PATTERN).mock(
        return_value=Response(401, content=b'{"error":"bad key"}')
    )
    with pytest.raises(ElevenLabsTTSError) as exc_info:
        await synthesize("你好", api_key="bad-key")
    assert exc_info.value.code == 401


@respx.mock
async def test_synthesize_raises_on_empty_stream():
    respx.post(url__startswith=TTS_URL_PATTERN).mock(return_value=Response(200, content=b""))
    with pytest.raises(ElevenLabsTTSError) as exc_info:
        await synthesize("你好", api_key="xi-key")
    assert "0 audio bytes" in exc_info.value.message


def test_pick_voice_chinese():
    assert _pick_voice("你好世界") == VOICE_ID_ZH
    assert _pick_voice("hello 你好") == VOICE_ID_ZH


def test_pick_voice_english():
    assert _pick_voice("hello world") == VOICE_ID_EN
    assert _pick_voice("good morning!") == VOICE_ID_EN
