from unittest.mock import AsyncMock, MagicMock


def test_mic_flow_invokes_pipeline(client, monkeypatch):
    fake = AsyncMock()
    monkeypatch.setattr("openbuddy.ws.cardputer.run_pipeline", fake)
    # Ensure agent_manager is set; lifespan may not be triggered for bare TestClient
    from openbuddy.server import app

    if not hasattr(app.state, "agent_manager"):
        app.state.agent_manager = MagicMock()

    with client.websocket_connect("/ws/openbuddy?device_id=AA") as ws:
        ws.send_json({"type": "hello", "device_id": "AA", "fw_version": "1"})
        assert ws.receive_json()["type"] == "ready"
        ws.receive_json()  # initial state idle
        ws.send_json({"type": "mic_start"})
        ws.send_bytes(b"\x00\x01" * 100)
        ws.send_json({"type": "mic_stop"})
        # Give asyncio.create_task a moment to schedule run_pipeline
        import time

        time.sleep(0.1)

    assert fake.await_count >= 1, "run_pipeline should have been called"
