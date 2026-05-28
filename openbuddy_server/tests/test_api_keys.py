from openbuddy.keychain import KeyName, KeyStore


def test_get_keys_returns_redacted(client, fake_keyring):
    KeyStore().set(KeyName.ELEVENLABS, "xi-1234abcd")
    r = client.get("/api/keys")
    assert r.status_code == 200
    assert r.json()["elevenlabs"] == "sk-***abcd"
    assert r.json()["dashscope"] is None


def test_put_keys_sets_value(client, fake_keyring):
    r = client.put("/api/keys", json={"name": "dashscope", "value": "sk-xyz"})
    assert r.status_code == 204
    assert KeyStore().get(KeyName.DASHSCOPE) == "sk-xyz"


def test_put_keys_rejects_unknown(client):
    r = client.put("/api/keys", json={"name": "openai", "value": "x"})
    assert r.status_code == 422
