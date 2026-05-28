import os

from openbuddy.agent.env import DEFAULT_BASE_URL, DEFAULT_MODEL, inject_llm_env

ENV_KEYS = [
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "API_TIMEOUT_MS",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
]


def test_inject_defaults_sets_all_8_vars(monkeypatch):
    for k in ENV_KEYS:
        monkeypatch.delenv(k, raising=False)
    inject_llm_env("mm-test-key")
    assert os.environ["ANTHROPIC_BASE_URL"] == DEFAULT_BASE_URL
    assert os.environ["ANTHROPIC_AUTH_TOKEN"] == "mm-test-key"
    assert os.environ["ANTHROPIC_MODEL"] == DEFAULT_MODEL
    assert os.environ["ANTHROPIC_DEFAULT_SONNET_MODEL"] == DEFAULT_MODEL
    assert os.environ["API_TIMEOUT_MS"] == "3000000"
    assert os.environ["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] == "1"


def test_inject_custom_base_url_and_model(monkeypatch):
    for k in ENV_KEYS:
        monkeypatch.delenv(k, raising=False)
    inject_llm_env("custom-key", base_url="https://custom.api/v1", model="custom-model")
    assert os.environ["ANTHROPIC_BASE_URL"] == "https://custom.api/v1"
    assert os.environ["ANTHROPIC_AUTH_TOKEN"] == "custom-key"
    assert os.environ["ANTHROPIC_MODEL"] == "custom-model"
    assert os.environ["ANTHROPIC_DEFAULT_SONNET_MODEL"] == "custom-model"
    assert os.environ["ANTHROPIC_DEFAULT_OPUS_MODEL"] == "custom-model"
    assert os.environ["ANTHROPIC_DEFAULT_HAIKU_MODEL"] == "custom-model"
