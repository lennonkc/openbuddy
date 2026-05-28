"""ElevenLabs TTS 客户端 — 返回 PCM16 16k mono，自动根据文本语言选择中/英语音。"""

from __future__ import annotations

import re

import httpx

TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
MODEL = "eleven_v3"
VOICE_ID_ZH = "bhJUNIXWQQ94l8eI2VUf"
VOICE_ID_EN = "xctasy8XvGp2cVO9HL9k"
OUTPUT_FORMAT = "pcm_16000"
TIMEOUT_SECONDS = 60.0

_CJK_RE = re.compile(r"[一-鿿㐀-䶿]")


class ElevenLabsTTSError(RuntimeError):
    """ElevenLabs API 返回了错误响应。"""

    def __init__(self, code: int, message: str) -> None:
        super().__init__(f"ElevenLabs TTS error {code}: {message}")
        self.code = code
        self.message = message


def _pick_voice(text: str) -> str:
    """文本含 CJK 字符 → 中文语音，否则英文语音。"""
    return VOICE_ID_ZH if _CJK_RE.search(text) else VOICE_ID_EN


async def synthesize(text: str, *, api_key: str) -> bytes:
    """调 ElevenLabs TTS stream 接口，返回 PCM16 16k mono raw 字节。

    Raises:
        ElevenLabsTTSError: HTTP 失败 / 空响应
    """
    voice_id = _pick_voice(text)
    url = TTS_URL.format(voice_id=voice_id)

    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        async with client.stream(
            "POST",
            url,
            params={"output_format": OUTPUT_FORMAT},
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": MODEL,
            },
        ) as r:
            if r.status_code >= 400:
                body = (await r.aread()).decode(errors="replace")
                raise ElevenLabsTTSError(r.status_code, f"HTTP {r.status_code}: {body[:200]}")

            chunks: list[bytes] = []
            total_bytes = 0
            async for chunk in r.aiter_bytes():
                chunks.append(chunk)
                total_bytes += len(chunk)

    if total_bytes == 0:
        raise ElevenLabsTTSError(-1, "stream ended with 0 audio bytes")
    return b"".join(chunks)
