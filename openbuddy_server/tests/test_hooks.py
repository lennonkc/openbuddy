from unittest.mock import AsyncMock


def test_hook_rejects_remote(client):
    # TestClient's default client_host is "testclient"; we don't override here.
    # Implementation MUST allow {"127.0.0.1", "localhost", "testclient"} so tests pass.
    r = client.post(
        "/hooks/Stop",
        json={"session_id": "openbuddy"},
    )
    assert r.status_code == 200


def test_non_openbuddy_session_filtered(client):
    r = client.post(
        "/hooks/Stop",
        json={"session_id": "some-other-cli-session"},
    )
    assert r.status_code == 200  # silently accepted, not propagated


def test_unknown_hook_name_still_200(client):
    r = client.post("/hooks/Whatever", json={"session_id": "openbuddy"})
    assert r.status_code == 200


def test_openbuddy_session_publishes_to_bus(client, monkeypatch):
    from openbuddy.server import app

    fake = AsyncMock()
    monkeypatch.setattr(app.state.event_bus, "publish", fake)
    r = client.post(
        "/hooks/PostToolUse",
        json={
            "session_id": "openbuddy",
            "hook_event_name": "PostToolUse",
            "tool_name": "Bash",
        },
    )
    assert r.status_code == 200
    fake.assert_awaited_once()
    args = fake.await_args.args[0]
    assert args["type"] == "hook"
    assert args["name"] == "PostToolUse"
    assert args["tool_name"] == "Bash"


def test_stop_hook_publishes_sfx_done(client, monkeypatch):
    from openbuddy.server import app

    fake = AsyncMock()
    monkeypatch.setattr(app.state.event_bus, "publish", fake)
    r = client.post(
        "/hooks/Stop",
        json={"session_id": "openbuddy", "hook_event_name": "Stop"},
    )
    assert r.status_code == 200
    # 2 publishes: 1 hook event + 1 sfx done
    assert fake.await_count == 2
    calls = [c.args[0] for c in fake.await_args_list]
    sfx = next(c for c in calls if c.get("type") == "sfx")
    assert sfx["name"] == "done"
