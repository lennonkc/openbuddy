import asyncio
import datetime
import json as _json
import logging
import time

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from openbuddy.agent.lifecycle import AgentManager
from openbuddy.api.config import get_cwd
from openbuddy.keychain import KeyStore
from openbuddy.voice.buffer import AudioBuffer
from openbuddy.voice.pipeline import run_pipeline
from openbuddy.ws.protocol import (
    ClientAuthorizationResponse,
    ClientHello,
    ClientMicStart,
    ClientMicStop,
    ClientReset,
    parse_client_frame,
    ready_frame,
)

router = APIRouter()
log = logging.getLogger(__name__)
_current_ws: WebSocket | None = None

# TTS PCM 推送节流 — 防止一次 send_bytes 灌爆设备 64KB ringbuf。
# 4 KB piece 与设备 `pump_playback` 的 xRingbufferReceiveUpTo(4096) drain 单位
# 对齐,200 ms ahead 给 WS jitter 留 buffer 又不撑爆 ring。
_PIECE_BYTES = 4096
_REALTIME_BYTES_PER_SEC = 32_000  # PCM16-LE 16 kHz mono
_TARGET_BUFFER_AHEAD_MS = 200


async def _send_pcm_paced(ws: WebSocket, pcm: bytes) -> None:
    """切片 + 节流地把 PCM 推给设备,防 ringbuf overflow。"""
    if len(pcm) % 2:
        pcm = pcm[:-1]
    start = time.monotonic()
    bytes_sent = 0
    total = len(pcm)
    for offset in range(0, total, _PIECE_BYTES):
        await ws.send_bytes(pcm[offset : offset + _PIECE_BYTES])
        bytes_sent += min(_PIECE_BYTES, total - offset)
        expected_ms = (bytes_sent * 1000) // _REALTIME_BYTES_PER_SEC
        actual_ms = int((time.monotonic() - start) * 1000)
        if expected_ms > actual_ms + _TARGET_BUFFER_AHEAD_MS:
            await asyncio.sleep((expected_ms - actual_ms - _TARGET_BUFFER_AHEAD_MS) / 1000.0)


@router.websocket("/ws/openbuddy")
async def ws_openbuddy(ws: WebSocket, device_id: str = Query(...)) -> None:
    global _current_ws
    if _current_ws is not None:
        log.info("evicting stale device connection")
        stale = _current_ws
        _current_ws = None
        ws.app.state.connected_device = None
        try:
            await stale.close(code=status.WS_1001_GOING_AWAY)
        except Exception:
            pass
    await ws.accept()
    _current_ws = ws

    bus = ws.app.state.event_bus
    keys = KeyStore()
    agent: AgentManager = ws.app.state.agent_manager
    buffer = AudioBuffer()
    recording = False

    async def relay_events() -> None:
        async with bus.subscribe() as q:
            while True:
                msg = await q.get()
                if msg.get("type") == "tts_pcm":
                    await _send_pcm_paced(ws, msg["pcm"])
                else:
                    await ws.send_json(msg)

    async def heartbeat() -> None:
        while True:
            await asyncio.sleep(15)
            await ws.send_json({"type": "heartbeat"})

    relay = asyncio.create_task(relay_events())
    beat = asyncio.create_task(heartbeat())

    try:
        # wait for hello
        raw = await ws.receive_json()
        if not isinstance(parse_client_frame(raw), ClientHello):
            await ws.close()
            return
        await ws.send_json(ready_frame())
        ws.app.state.connected_device = {
            "device_id": device_id,
            "fw_version": raw.get("fw_version", ""),
            "device_name": raw.get("device_name", ""),
            "connected_since": datetime.datetime.now(datetime.UTC).isoformat(),
        }
        device_name = raw.get("device_name", "Device")
        try:
            await ws.app.state.chat_history.start_conversation(device_name)
        except Exception:
            log.warning("failed to start conversation for device session", exc_info=True)
        await bus.publish({"type": "state", "state": "idle"})

        while True:
            evt = await ws.receive()
            if evt["type"] == "websocket.disconnect":
                break
            if "bytes" in evt and evt["bytes"] is not None and recording:
                buffer.append(evt["bytes"])
                continue
            if "text" not in evt or evt["text"] is None:
                continue
            frame = parse_client_frame(_json.loads(evt["text"]))
            if isinstance(frame, ClientMicStart):
                recording = True
                buffer = AudioBuffer()
                await bus.publish({"type": "state", "state": "listening"})
            elif isinstance(frame, ClientMicStop):
                recording = False
                pcm = buffer.drain()
                cwd = get_cwd(ws.app)
                config_dir = ws.app.state.settings.config_dir
                asyncio.create_task(
                    run_pipeline(
                        pcm=pcm,
                        cwd=cwd,
                        agent=agent,
                        keys=keys,
                        bus=bus,
                        prompts_path=config_dir / "prompts.json",
                        agent_prompt_path=config_dir / "agent_prompt.json",
                        history=ws.app.state.chat_history,
                    )
                )
            elif isinstance(frame, ClientAuthorizationResponse):
                auth = ws.app.state.auth_manager
                auth.resolve(frame.request_id, frame.approved)
            elif isinstance(frame, ClientReset):
                recording = False
                buffer = AudioBuffer()
                await bus.publish({"type": "state", "state": "idle"})
    except WebSocketDisconnect:
        pass
    finally:
        relay.cancel()
        beat.cancel()
        if _current_ws is ws:
            _current_ws = None
            ws.app.state.connected_device = None
            await bus.publish({"type": "state", "state": "disconnected"})
