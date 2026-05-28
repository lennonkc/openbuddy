from unittest.mock import AsyncMock, patch

import keyring
import pytest
from fastapi.testclient import TestClient

from openbuddy.server import app


@pytest.fixture(autouse=True)
def _mock_mdns():
    mock_reg = AsyncMock(return_value=(
        None,
        None,
        {"broadcasting": False, "hostname": "openbuddy.local", "ip": "", "port": 0},
    ))
    with patch("openbuddy.server.register_mdns", mock_reg):
        yield


@pytest.fixture(autouse=True)
def fake_keyring(monkeypatch):
    store: dict[tuple[str, str], str] = {}
    monkeypatch.setattr(keyring, "set_password", lambda s, n, p: store.__setitem__((s, n), p))
    monkeypatch.setattr(keyring, "get_password", lambda s, n: store.get((s, n)))
    monkeypatch.setattr(keyring, "delete_password", lambda s, n: store.pop((s, n), None))
    return store


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
