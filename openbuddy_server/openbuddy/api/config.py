import json
from pathlib import Path

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/api/config", tags=["config"])

_DEFAULTS = {"cwd": str(Path.home()), "buddy_skin": "royal-crown"}
CONFIG_FILE = "config.json"


def _config_path(request: Request) -> Path:
    return request.app.state.settings.config_dir / CONFIG_FILE


def _read_config(path: Path) -> dict[str, str]:
    if not path.is_file():
        return dict(_DEFAULTS)
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return dict(_DEFAULTS)
    return {
        "cwd": data.get("cwd", _DEFAULTS["cwd"]),
        "buddy_skin": data.get("buddy_skin", _DEFAULTS["buddy_skin"]),
    }


def _write_config(path: Path, data: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))


def get_cwd(app) -> str:
    """Public helper to read cwd from the config file on disk."""
    config_dir = app.state.settings.config_dir
    path = config_dir / CONFIG_FILE
    return _read_config(path)["cwd"]


class ConfigUpdate(BaseModel):
    cwd: str | None = None
    buddy_skin: str | None = None

    @field_validator("cwd")
    @classmethod
    def must_exist(cls, v: str | None) -> str | None:
        if v is None:
            return v
        p = Path(v).expanduser()
        if not p.is_dir():
            raise ValueError(f"directory does not exist: {v}")
        return str(p.resolve())


@router.get("")
def get_config(request: Request) -> dict[str, str]:
    return _read_config(_config_path(request))


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
def put_config(payload: ConfigUpdate, request: Request) -> None:
    path = _config_path(request)
    current = _read_config(path)
    if payload.cwd is not None:
        current["cwd"] = payload.cwd
    if payload.buddy_skin is not None:
        current["buddy_skin"] = payload.buddy_skin
    _write_config(path, current)
