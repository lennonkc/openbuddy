import httpx
import pytest
import respx
from httpx import Response

from openbuddy.voice.stt import transcribe


@respx.mock
async def test_transcribe_returns_text(monkeypatch):
    monkeypatch.setenv("OPENBUDDY_PORT", "8000")
    route = respx.post("https://api.elevenlabs.io/v1/speech-to-text").mock(
        return_value=Response(200, json={"text": "你好世界"})
    )
    text = await transcribe(b"\x00\x00" * 1600, api_key="xi-test")
    assert text == "你好世界"
    sent = route.calls.last.request
    body = sent.content
    assert b"no_verbatim" in body and b"true" in body
    assert b"tag_audio_events" in body and b"false" in body
    assert b"scribe_v2" in body


@respx.mock
async def test_transcribe_raises_on_http_error():
    respx.post("https://api.elevenlabs.io/v1/speech-to-text").mock(
        return_value=Response(401, json={"detail": "bad key"})
    )
    with pytest.raises(httpx.HTTPStatusError):
        await transcribe(b"\x00" * 100, api_key="bad")
