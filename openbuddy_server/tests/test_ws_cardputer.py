import time

import pytest

from openbuddy.ws.cardputer import _send_pcm_paced


def test_ws_rejects_missing_device_id(client):
    with pytest.raises(Exception):  # noqa: B017
        with client.websocket_connect("/ws/openbuddy") as ws:
            ws.receive_json()


def test_ws_hello_then_ready(client):
    with client.websocket_connect("/ws/openbuddy?device_id=AA:BB:CC:DD:EE:FF") as ws:
        ws.send_json({"type": "hello", "device_id": "AA:BB:CC:DD:EE:FF", "fw_version": "1"})
        msg = ws.receive_json()
        assert msg["type"] == "ready"


def test_ws_reconnect_evicts_stale(client):
    """New connection evicts stale _current_ws and completes handshake."""
    from unittest.mock import AsyncMock

    from openbuddy.ws import cardputer

    cardputer._current_ws = AsyncMock()
    try:
        with client.websocket_connect("/ws/openbuddy?device_id=AA:BB:CC:DD:EE:FF") as ws:
            ws.send_json({"type": "hello", "device_id": "aabbccddeeff", "fw_version": "1"})
            msg = ws.receive_json()
            assert msg["type"] == "ready"
    finally:
        cardputer._current_ws = None


class _FakeWs:
    def __init__(self) -> None:
        self.chunks: list[bytes] = []

    async def send_bytes(self, data: bytes) -> None:
        self.chunks.append(data)


async def test_pcm_pacing_slices_into_4k_pieces():
    pcm = b"\x00\x01" * 10_000  # 20 000 字节
    ws = _FakeWs()
    await _send_pcm_paced(ws, pcm)
    assert b"".join(ws.chunks) == pcm
    # 除最后一片外应为 4096 字节
    assert all(len(c) == 4096 for c in ws.chunks[:-1])
    assert len(ws.chunks[-1]) <= 4096


async def test_pcm_pacing_respects_realtime_budget():
    # 96 000 字节 ≈ 3.0s realtime PCM。pacing 应让总耗时 ≥ ~2.8s
    # (3.0s 数据 - 0.2s lead) 才推完;而 unpaced send 应在 << 100ms 内完成。
    pcm = b"\x00\x01" * 48_000
    ws = _FakeWs()
    t0 = time.monotonic()
    await _send_pcm_paced(ws, pcm)
    elapsed = time.monotonic() - t0
    assert elapsed >= 2.5, f"pacing too fast ({elapsed:.2f}s)"
    assert b"".join(ws.chunks) == pcm
