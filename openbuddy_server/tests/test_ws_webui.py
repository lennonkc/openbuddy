def test_webui_receives_initial_state(client):
    with client.websocket_connect("/ws/webui") as ws:
        msg = ws.receive_json()
        assert msg == {"type": "state", "state": "disconnected"}


def test_webui_receives_published_event(client):
    with client.websocket_connect("/ws/webui") as ws:
        ws.receive_json()  # initial state
        client.post(
            "/hooks/PostToolUse",
            json={
                "session_id": "openbuddy",
                "hook_event_name": "PostToolUse",
                "tool_name": "Bash",
            },
        )
        msg = ws.receive_json()
        assert msg["type"] == "hook"
        assert msg["name"] == "PostToolUse"
