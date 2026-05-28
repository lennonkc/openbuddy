from pathlib import Path

from openbuddy.server import app


def test_default_cwd_is_home(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "config_dir", tmp_path)
    r = client.get("/api/config")
    assert r.status_code == 200
    assert r.json()["cwd"].startswith("/")


def test_put_cwd_updates(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "config_dir", tmp_path)
    r = client.put("/api/config", json={"cwd": str(tmp_path)})
    assert r.status_code == 204
    # resolve() normalises symlinks; on macOS /tmp -> /private/tmp and
    # /var/folders -> /private/var/folders, so compare resolved paths.
    assert Path(client.get("/api/config").json()["cwd"]).resolve() == tmp_path.resolve()


def test_put_cwd_rejects_nonexistent(client):
    r = client.put("/api/config", json={"cwd": "/does/not/exist"})
    assert r.status_code == 422


def test_config_includes_buddy_skin(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "config_dir", tmp_path)
    r = client.get("/api/config")
    assert "buddy_skin" in r.json()
    assert r.json()["buddy_skin"] == "royal-crown"


def test_put_buddy_skin(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "config_dir", tmp_path)
    r = client.put("/api/config", json={"cwd": str(tmp_path), "buddy_skin": "warrior"})
    assert r.status_code == 204
    r2 = client.get("/api/config")
    assert r2.json()["buddy_skin"] == "warrior"
