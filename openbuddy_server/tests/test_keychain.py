from openbuddy.keychain import KeyName, KeyStore


def test_set_and_get_roundtrip():
    ks = KeyStore()
    ks.set(KeyName.ELEVENLABS, "xi-abc")
    assert ks.get(KeyName.ELEVENLABS) == "xi-abc"


def test_missing_key_returns_none():
    assert KeyStore().get(KeyName.DASHSCOPE) is None


def test_all_keys_known():
    assert {k.value for k in KeyName} == {"elevenlabs", "dashscope", "llm"}


def test_redacted_view_hides_secret():
    ks = KeyStore()
    ks.set(KeyName.DASHSCOPE, "sk-very-secret-1234")
    redacted = ks.redacted()
    assert redacted["dashscope"] == "sk-***1234"
    assert redacted["elevenlabs"] is None
