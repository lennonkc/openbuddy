import json
import subprocess
from unittest.mock import MagicMock, patch

import pytest

from openbuddy.server import app


@pytest.fixture(autouse=True)
def _reset_picker_lock():
    yield
    from openbuddy.api.fs import _picker_lock

    if _picker_lock.locked():
        _picker_lock.release()


def test_suggest_lists_subdirs(client, tmp_path):
    (tmp_path / "alpha").mkdir()
    (tmp_path / "beta").mkdir()
    (tmp_path / "ignore.txt").write_text("x")
    r = client.get(f"/api/fs/suggest?prefix={tmp_path}/")
    assert r.status_code == 200
    items = r.json()["items"]
    assert {"alpha", "beta"}.issubset(set(items))
    assert "ignore.txt" not in items


def test_suggest_filters_by_prefix(client, tmp_path):
    (tmp_path / "alpha").mkdir()
    (tmp_path / "beta").mkdir()
    r = client.get(f"/api/fs/suggest?prefix={tmp_path}/al")
    assert r.json()["items"] == ["alpha"]


def test_suggest_handles_missing_dir(client):
    r = client.get("/api/fs/suggest?prefix=/this/does/not/exist/")
    assert r.json()["items"] == []


# --- pick-directory ---


@patch("openbuddy.api.fs.sys")
@patch("openbuddy.api.fs.subprocess.run")
def test_pick_directory_success(mock_run, mock_sys, client, tmp_path):
    mock_sys.platform = "darwin"
    chosen = tmp_path / "chosen"
    chosen.mkdir()
    mock_run.return_value = MagicMock(returncode=0, stdout=f"{chosen}/\n", stderr="")
    r = client.post("/api/fs/pick-directory", json={"default_path": str(tmp_path)})
    assert r.status_code == 200
    assert r.json()["path"] == str(chosen)
    assert r.json()["cancelled"] is False


@patch("openbuddy.api.fs.sys")
@patch("openbuddy.api.fs.subprocess.run")
def test_pick_directory_cancelled(mock_run, mock_sys, client):
    mock_sys.platform = "darwin"
    mock_run.return_value = MagicMock(
        returncode=1, stdout="", stderr="0:17: execution error: User canceled. (-128)\n"
    )
    r = client.post("/api/fs/pick-directory", json={})
    assert r.status_code == 200
    assert r.json()["cancelled"] is True


@patch("openbuddy.api.fs.sys")
@patch("openbuddy.api.fs.subprocess.run")
def test_pick_directory_timeout(mock_run, mock_sys, client):
    mock_sys.platform = "darwin"
    mock_run.side_effect = subprocess.TimeoutExpired(cmd="osascript", timeout=120)
    r = client.post("/api/fs/pick-directory", json={})
    assert r.status_code == 200
    assert r.json()["cancelled"] is True


@patch("openbuddy.api.fs.sys")
def test_pick_directory_non_darwin(mock_sys, client):
    mock_sys.platform = "linux"
    r = client.post("/api/fs/pick-directory", json={})
    assert r.status_code == 501


@patch("openbuddy.api.fs.sys")
def test_pick_directory_concurrent_rejected(mock_sys, client):
    mock_sys.platform = "darwin"
    from openbuddy.api.fs import _picker_lock

    _picker_lock.acquire()
    try:
        r = client.post("/api/fs/pick-directory", json={})
        assert r.status_code == 409
    finally:
        _picker_lock.release()


@patch("openbuddy.api.fs.sys")
@patch("openbuddy.api.fs.subprocess.run")
def test_pick_directory_rejects_control_chars(mock_run, mock_sys, client, tmp_path):
    mock_sys.platform = "darwin"
    mock_run.return_value = MagicMock(returncode=0, stdout=f"{tmp_path}/\n", stderr="")
    r = client.post("/api/fs/pick-directory", json={"default_path": f"{tmp_path}\n/evil"})
    assert r.status_code == 200
    args = mock_run.call_args[0][0]
    assert "default location" not in " ".join(args)


# --- list ---


def _set_cwd(monkeypatch, cwd_path, config_dir=None):
    """Point app config_dir and write config.json with cwd=cwd_path.

    Uses a separate config_dir so config.json doesn't pollute cwd listing.
    """
    if config_dir is None:
        config_dir = cwd_path / ".config"
        config_dir.mkdir(exist_ok=True)
    monkeypatch.setattr(app.state.settings, "config_dir", config_dir)
    (config_dir / "config.json").write_text(json.dumps({"cwd": str(cwd_path)}))


def test_list_cwd_root(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    (tmp_path / "adir").mkdir()
    (tmp_path / "bdir").mkdir()
    (tmp_path / "cfile.txt").write_text("hello")
    (tmp_path / ".hidden").mkdir()

    r = client.get("/api/fs/list", params={"path": str(tmp_path)})
    assert r.status_code == 200
    items = r.json()["items"]
    names = [i["name"] for i in items]
    # hidden excluded
    assert ".hidden" not in names
    # dirs first, then files, each alphabetical
    assert names == ["adir", "bdir", "cfile.txt"]
    # dirs have type "directory", files have type "file"
    assert items[0]["type"] == "directory"
    assert items[2]["type"] == "file"
    # file has size
    assert items[2]["size"] > 0


def test_list_subdir(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    sub = tmp_path / "sub"
    sub.mkdir()
    (sub / "inner.txt").write_text("x")

    r = client.get("/api/fs/list", params={"path": str(sub)})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "inner.txt"


def test_list_path_traversal_blocked(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    r = client.get("/api/fs/list", params={"path": str(tmp_path / ".." / "..")})
    assert r.status_code == 403


def test_list_symlink_escape_blocked(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    # symlink inside cwd pointing outside
    link = tmp_path / "escape_link"
    link.symlink_to("/tmp")
    r = client.get("/api/fs/list", params={"path": str(link)})
    assert r.status_code == 403


def test_list_nonexistent_path(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    r = client.get("/api/fs/list", params={"path": str(tmp_path / "nope")})
    assert r.status_code == 404


# --- stat ---


def test_stat_file(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    f = tmp_path / "hello.py"
    f.write_text("print('hi')")

    r = client.get("/api/fs/stat", params={"path": str(f)})
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "hello.py"
    assert data["type"] == "file"
    assert data["size"] == len("print('hi')")
    assert data["mime"] == "text/x-python"
    assert "mtime" in data


def test_stat_dir(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    d = tmp_path / "subdir"
    d.mkdir()

    r = client.get("/api/fs/stat", params={"path": str(d)})
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "subdir"
    assert data["type"] == "directory"
    assert data["mime"] is None


def test_stat_outside_cwd(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    r = client.get("/api/fs/stat", params={"path": "/etc/passwd"})
    assert r.status_code == 403


# --- read ---


def test_read_text_file(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    f = tmp_path / "hello.py"
    f.write_text("print('hi')", encoding="utf-8")

    r = client.get("/api/fs/read", params={"path": str(f)})
    assert r.status_code == 200
    data = r.json()
    assert data["content"] == "print('hi')"
    assert data["truncated"] is False


def test_read_text_truncated(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    f = tmp_path / "big.txt"
    # Write >1MB of text
    f.write_text("A" * (1024 * 1024 + 100), encoding="utf-8")

    r = client.get("/api/fs/read", params={"path": str(f)})
    assert r.status_code == 200
    data = r.json()
    assert len(data["content"]) == 1024 * 1024
    assert data["truncated"] is True


def test_read_binary_file(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    f = tmp_path / "image.png"
    # Minimal PNG header
    png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    f.write_bytes(png_header)

    r = client.get("/api/fs/read", params={"path": str(f)})
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content == png_header


def test_read_outside_cwd(client, tmp_path, monkeypatch):
    _set_cwd(monkeypatch, tmp_path)
    r = client.get("/api/fs/read", params={"path": "/etc/passwd"})
    assert r.status_code == 403
