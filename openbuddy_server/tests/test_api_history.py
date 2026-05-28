import pytest
from fastapi.testclient import TestClient

from openbuddy.server import app


@pytest.fixture
def client(tmp_path, monkeypatch, _mock_mdns, fake_keyring):
    monkeypatch.setenv("OPENBUDDY_CONFIG_DIR", str(tmp_path))
    with TestClient(app) as c:
        yield c


def test_get_messages_empty(client: TestClient):
    r = client.get("/api/messages")
    assert r.status_code == 200
    assert r.json() == []


def test_clear_messages(client: TestClient):
    r = client.delete("/api/messages")
    assert r.status_code == 204
