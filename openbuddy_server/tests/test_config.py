from openbuddy.config import Settings


def test_settings_defaults(monkeypatch):
    monkeypatch.delenv("OPENBUDDY_PORT", raising=False)
    s = Settings()
    assert s.port == 8000
    assert s.host == "0.0.0.0"
    assert s.log_dir.name == "openbuddy"


def test_settings_port_override(monkeypatch):
    monkeypatch.setenv("OPENBUDDY_PORT", "9000")
    assert Settings().port == 9000
