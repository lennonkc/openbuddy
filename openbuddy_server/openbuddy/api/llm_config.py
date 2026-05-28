import json
from pathlib import Path

from fastapi import APIRouter, Request, status
from pydantic import BaseModel

from openbuddy.agent.env import DEFAULT_BASE_URL, DEFAULT_MODEL

router = APIRouter(prefix="/api/llm-config", tags=["llm-config"])

LLM_CONFIG_FILE = "llm_config.json"


def _config_path(request: Request) -> Path:
    return request.app.state.settings.config_dir / LLM_CONFIG_FILE


def read_llm_config(config_dir: Path) -> dict[str, str | None]:
    path = config_dir / LLM_CONFIG_FILE
    if not path.is_file():
        return {"base_url": None, "model": None}
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {"base_url": None, "model": None}
    return {
        "base_url": data.get("base_url") or None,
        "model": data.get("model") or None,
    }


class LlmConfigUpdate(BaseModel):
    base_url: str | None = None
    model: str | None = None


@router.get("")
def get_llm_config(request: Request) -> dict[str, str]:
    cfg = read_llm_config(request.app.state.settings.config_dir)
    return {
        "base_url": cfg["base_url"] or DEFAULT_BASE_URL,
        "model": cfg["model"] or DEFAULT_MODEL,
    }


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
def put_llm_config(payload: LlmConfigUpdate, request: Request) -> None:
    path = _config_path(request)
    path.parent.mkdir(parents=True, exist_ok=True)
    data: dict[str, str] = {}
    if payload.base_url and payload.base_url.strip():
        data["base_url"] = payload.base_url.strip()
    if payload.model and payload.model.strip():
        data["model"] = payload.model.strip()
    path.write_text(json.dumps(data))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_llm_config(request: Request) -> None:
    path = _config_path(request)
    if path.is_file():
        path.unlink()
