from openbuddy.mdns import get_local_ip


def test_get_local_ip_returns_string():
    ip = get_local_ip()
    assert isinstance(ip, str)
    parts = ip.split(".")
    assert len(parts) == 4


def test_mdns_status_endpoint(client):
    r = client.get("/api/mdns")
    assert r.status_code == 200
    data = r.json()
    assert data["hostname"] == "openbuddy.local"
    assert isinstance(data["port"], int)
