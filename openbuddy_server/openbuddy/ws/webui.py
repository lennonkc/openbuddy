import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
log = logging.getLogger(__name__)


@router.websocket("/ws/webui")
async def ws_webui(ws: WebSocket) -> None:
    client_host = ws.client.host if ws.client else "unknown"
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        log.warning("WebUI WebSocket from non-localhost: %s (unauthenticated)", client_host)
    await ws.accept()
    bus = ws.app.state.event_bus

    await ws.send_json({"type": "state", "state": bus.last_device_state})

    try:
        async with bus.subscribe() as q:
            while True:
                msg = await q.get()
                # tts_pcm 携带 raw bytes,不 JSON 序列化;webui 只显示文本事件,
                # 不消费二进制 PCM。直接跳过避免 send_json 崩溃(进而触发
                # keepalive AssertionError 把整个 ws 拉死)。
                if msg.get("type") == "tts_pcm":
                    continue
                await ws.send_json(msg)
    except WebSocketDisconnect:
        return
