import io
import logging
import time
import wave

import httpx

SCRIBE_URL = "https://api.elevenlabs.io/v1/speech-to-text"
TIMEOUT_SECONDS = 20.0  # 短录音应该 1-2s 回；超过 20s 大概率是代理/网络问题

log = logging.getLogger(__name__)


def _pcm_to_wav_bytes(pcm: bytes, sample_rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm)
    return buf.getvalue()


async def transcribe(pcm: bytes, *, api_key: str, language_code: str = "") -> str:
    wav = _pcm_to_wav_bytes(pcm)
    files = {"file": ("audio.wav", wav, "audio/wav")}
    data = {
        "model_id": "scribe_v2",
        "no_verbatim": "true",
        "tag_audio_events": "false",
    }
    if language_code:
        data["language_code"] = language_code
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        t0 = time.monotonic()
        log.info("STT: posting %d bytes WAV to ElevenLabs", len(wav))
        r = await client.post(
            SCRIBE_URL,
            headers={"xi-api-key": api_key},
            files=files,
            data=data,
        )
        log.info("STT: response HTTP %d in %.2fs", r.status_code, time.monotonic() - t0)
        r.raise_for_status()
        return r.json()["text"]
