import json
from pathlib import Path

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, field_validator

router = APIRouter(prefix="/api/agent-prompt", tags=["agent-prompt"])

AGENT_PROMPT_FILE = "agent_prompt.json"


def _prompt_path(request: Request) -> Path:
    return request.app.state.settings.config_dir / AGENT_PROMPT_FILE


def read_agent_prompt(path: Path) -> str | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text())
        return data.get("system_prompt")
    except (json.JSONDecodeError, OSError):
        return None


class AgentPromptUpdate(BaseModel):
    system_prompt: str

    @field_validator("system_prompt")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("system_prompt must not be blank")
        return v


@router.get("")
def get_agent_prompt(request: Request) -> dict[str, str | None]:
    return {"system_prompt": read_agent_prompt(_prompt_path(request))}


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
def put_agent_prompt(payload: AgentPromptUpdate, request: Request) -> None:
    path = _prompt_path(request)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"system_prompt": payload.system_prompt}))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent_prompt(request: Request) -> None:
    path = _prompt_path(request)
    if path.is_file():
        path.unlink()
