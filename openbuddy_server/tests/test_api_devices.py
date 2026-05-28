import json

from openbuddy.server import app


def test_get_devices_empty(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", tmp_path / "devices.json")
    r = client.get("/api/devices")
    assert r.status_code == 200
    assert r.json() == []


def test_post_device_adds_to_whitelist(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": []}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    r = client.post("/api/devices", json={"mac": "AA:BB:CC:DD:EE:FF"})
    assert r.status_code == 201
    data = json.loads(f.read_text())
    assert "aabbccddeeff" in data["allowed_mac"]


def test_post_device_with_name(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": []}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    r = client.post("/api/devices", json={"mac": "AA:BB:CC:DD:EE:FF", "name": "My Cardputer"})
    assert r.status_code == 201


def test_delete_device_removes_from_whitelist(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": []}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    client.post("/api/devices", json={"mac": "AA:BB:CC:DD:EE:FF"})
    r = client.delete("/api/devices/AA:BB:CC:DD:EE:FF")
    assert r.status_code == 204
    data = json.loads(f.read_text())
    assert "aabbccddeeff" not in data["allowed_mac"]


def test_post_device_normalizes_mac_with_colons(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": []}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    r = client.post("/api/devices", json={"mac": "AA:BB:CC:DD:EE:FF"})
    assert r.status_code == 201
    assert r.json()["mac"] == "aabbccddeeff"


def test_post_device_rejects_invalid_mac(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": []}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    r = client.post("/api/devices", json={"mac": "hello"})
    assert r.status_code == 422


def test_list_devices_shows_registered_online(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": ["aabbccddeeff"]}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    app.state.connected_device = {
        "device_id": "AA:BB:CC:DD:EE:FF",
        "fw_version": "0.1",
        "device_name": "Cardputer",
        "connected_since": "2026-05-26T00:00:00+00:00",
    }
    try:
        r = client.get("/api/devices")
        devices = r.json()
        assert len(devices) == 1
        assert devices[0]["online"] is True
        assert devices[0]["fw_version"] == "0.1"
    finally:
        app.state.connected_device = None


def test_list_devices_includes_unregistered_connected(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": []}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    app.state.connected_device = {
        "device_id": "11:22:33:44:55:66",
        "fw_version": "0.1",
        "device_name": "StopWatch",
        "connected_since": "2026-05-26T00:00:00+00:00",
    }
    try:
        r = client.get("/api/devices")
        devices = r.json()
        assert len(devices) == 1
        assert devices[0]["online"] is True
        assert devices[0]["name"] == "StopWatch"
    finally:
        app.state.connected_device = None


def test_list_devices_no_duplicate_for_registered_connected(client, tmp_path, monkeypatch):
    f = tmp_path / "devices.json"
    f.write_text(json.dumps({"allowed_mac": ["aabbccddeeff"]}))
    monkeypatch.setattr(app.state.settings, "cardputer_devices_file", f)
    app.state.connected_device = {
        "device_id": "AA:BB:CC:DD:EE:FF",
        "fw_version": "0.1",
        "device_name": "Cardputer",
        "connected_since": "2026-05-26T00:00:00+00:00",
    }
    try:
        r = client.get("/api/devices")
        devices = r.json()
        assert len(devices) == 1
    finally:
        app.state.connected_device = None


def test_get_mdns_status(client):
    r = client.get("/api/mdns")
    assert r.status_code == 200
    data = r.json()
    assert "broadcasting" in data
    assert "hostname" in data
