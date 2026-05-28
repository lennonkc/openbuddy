from openbuddy.server import app


def test_get_prompts_returns_defaults(client):
    r = client.get("/api/prompts")
    assert r.status_code == 200
    data = r.json()
    assert data["stage1"] is None
    assert data["stage2"] is None


def test_put_prompts_saves(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "config_dir", tmp_path)
    r = client.put(
        "/api/prompts",
        json={
            "stage1": "custom prompt 1",
            "stage2": "custom prompt 2",
        },
    )
    assert r.status_code == 204
    r2 = client.get("/api/prompts")
    assert r2.json()["stage1"] == "custom prompt 1"
    assert r2.json()["stage2"] == "custom prompt 2"


def test_put_prompts_partial_update(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "config_dir", tmp_path)
    # Set both first
    client.put("/api/prompts", json={"stage1": "first", "stage2": "second"})
    # Update only stage1
    r = client.put("/api/prompts", json={"stage1": "updated"})
    assert r.status_code == 204
    r2 = client.get("/api/prompts")
    assert r2.json()["stage1"] == "updated"
    assert r2.json()["stage2"] == "second"


def test_delete_prompts_resets(client, tmp_path, monkeypatch):
    monkeypatch.setattr(app.state.settings, "config_dir", tmp_path)
    client.put("/api/prompts", json={"stage1": "x", "stage2": "y"})
    r = client.delete("/api/prompts")
    assert r.status_code == 204
    r2 = client.get("/api/prompts")
    assert r2.json()["stage1"] is None


def test_put_prompts_rejects_empty_string(client):
    r = client.put("/api/prompts", json={"stage1": "", "stage2": "ok"})
    assert r.status_code == 422


def test_put_prompts_rejects_all_none(client):
    r = client.put("/api/prompts", json={})
    assert r.status_code == 422
