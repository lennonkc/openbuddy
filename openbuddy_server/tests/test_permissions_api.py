import json

import pytest

from openbuddy.server import app


@pytest.fixture
def perms_path(tmp_path):
    """Redirect config_dir to tmp_path for isolation."""

    class FakeSettings:
        config_dir = tmp_path
        log_dir = tmp_path
        cardputer_devices_file = tmp_path / "devices.json"
        port = 8000
        host = "0.0.0.0"

        def ensure_dirs(self):
            pass

    original = getattr(app.state, "settings", None)
    app.state.settings = FakeSettings()
    yield tmp_path
    if original is not None:
        app.state.settings = original


def test_get_returns_defaults(client, perms_path):
    r = client.get("/api/permissions")
    assert r.status_code == 200
    data = r.json()
    assert data["default_policy"] == "always_ask"
    assert data["timeout_seconds"] == 60
    assert data["deny_interrupts"] is False
    assert data["tools"]["read"]["policy"] == "always_allow"
    assert data["tools"]["bash"]["policy"] == "always_ask"
    assert len(data["tools"]) == 8


def test_put_valid_config(client, perms_path):
    payload = {
        "default_policy": "always_allow",
        "timeout_seconds": 30,
        "deny_interrupts": True,
        "tools": {
            "bash": {"enabled": False, "policy": "always_ask"},
            "read": {"enabled": True, "policy": "always_allow"},
            "write": {"enabled": True, "policy": "always_ask"},
            "edit": {"enabled": True, "policy": "always_ask"},
            "glob": {"enabled": True, "policy": "always_allow"},
            "grep": {"enabled": True, "policy": "always_allow"},
            "web_fetch": {"enabled": True, "policy": "always_ask"},
            "web_search": {"enabled": True, "policy": "always_allow"},
        },
    }
    r = client.put("/api/permissions", json=payload)
    assert r.status_code == 204

    r2 = client.get("/api/permissions")
    data = r2.json()
    assert data["default_policy"] == "always_allow"
    assert data["timeout_seconds"] == 30
    assert data["deny_interrupts"] is True
    assert data["tools"]["bash"]["enabled"] is False


def test_put_invalid_timeout_too_low(client, perms_path):
    payload = {
        "default_policy": "always_ask",
        "timeout_seconds": 5,
        "deny_interrupts": False,
        "tools": {},
    }
    r = client.put("/api/permissions", json=payload)
    assert r.status_code == 422


def test_put_invalid_timeout_too_high(client, perms_path):
    payload = {
        "default_policy": "always_ask",
        "timeout_seconds": 999,
        "deny_interrupts": False,
        "tools": {},
    }
    r = client.put("/api/permissions", json=payload)
    assert r.status_code == 422


def test_put_invalid_policy(client, perms_path):
    payload = {
        "default_policy": "yolo",
        "timeout_seconds": 60,
        "deny_interrupts": False,
        "tools": {},
    }
    r = client.put("/api/permissions", json=payload)
    assert r.status_code == 422


def test_roundtrip_persists_to_file(client, perms_path):
    payload = {
        "default_policy": "always_allow",
        "timeout_seconds": 120,
        "deny_interrupts": True,
        "tools": {"bash": {"enabled": False, "policy": "always_ask"}},
    }
    client.put("/api/permissions", json=payload)
    raw = json.loads((perms_path / "permissions.json").read_text())
    assert raw["default_policy"] == "always_allow"
    assert raw["timeout_seconds"] == 120
