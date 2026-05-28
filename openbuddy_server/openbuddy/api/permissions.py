import json
import os
from enum import StrEnum
from pathlib import Path

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/permissions", tags=["permissions"])

PERMISSIONS_FILE = "permissions.json"


class ToolPolicy(StrEnum):
    ALWAYS_ASK = "always_ask"
    ALWAYS_ALLOW = "always_allow"


class ToolPermConfig(BaseModel):
    enabled: bool = True
    policy: ToolPolicy = ToolPolicy.ALWAYS_ASK


_DEFAULT_TOOLS: dict[str, ToolPermConfig] = {
    "bash": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ASK),
    "read": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ALLOW),
    "write": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ASK),
    "edit": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ASK),
    "glob": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ALLOW),
    "grep": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ALLOW),
    "web_fetch": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ASK),
    "web_search": ToolPermConfig(enabled=True, policy=ToolPolicy.ALWAYS_ALLOW),
}


class PermissionsConfig(BaseModel):
    default_policy: ToolPolicy = ToolPolicy.ALWAYS_ASK
    timeout_seconds: int = Field(default=60, ge=10, le=300)
    deny_interrupts: bool = False
    tools: dict[str, ToolPermConfig] = Field(
        default_factory=lambda: {k: v.model_copy() for k, v in _DEFAULT_TOOLS.items()}
    )


def read_permissions(config_dir: Path) -> PermissionsConfig:
    path = config_dir / PERMISSIONS_FILE
    if not path.is_file():
        return PermissionsConfig()
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return PermissionsConfig()
    return PermissionsConfig(**data)


def _write_permissions(config_dir: Path, config: PermissionsConfig) -> None:
    config_dir.mkdir(parents=True, exist_ok=True)
    target = config_dir / PERMISSIONS_FILE
    tmp = target.with_suffix(".tmp")
    try:
        tmp.write_bytes(json.dumps(config.model_dump(), indent=2).encode())
        os.replace(tmp, target)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


@router.get("")
def get_permissions(request: Request) -> PermissionsConfig:
    return read_permissions(request.app.state.settings.config_dir)


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
def put_permissions(payload: PermissionsConfig, request: Request) -> None:
    _write_permissions(request.app.state.settings.config_dir, payload)
