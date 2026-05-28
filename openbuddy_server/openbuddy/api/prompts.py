import json
from pathlib import Path

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, field_validator, model_validator

router = APIRouter(prefix="/api/prompts", tags=["prompts"])

PROMPTS_FILE = "prompts.json"


def _prompts_path(request: Request) -> Path:
    return request.app.state.settings.config_dir / PROMPTS_FILE


def _read(path: Path) -> dict[str, str | None]:
    if not path.is_file():
        return {"stage1": None, "stage2": None}
    data = json.loads(path.read_text())
    return {"stage1": data.get("stage1"), "stage2": data.get("stage2")}


class PromptsUpdate(BaseModel):
    stage1: str | None = None
    stage2: str | None = None

    @field_validator("stage1", "stage2")
    @classmethod
    def not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("prompt must not be blank")
        return v

    @model_validator(mode="after")
    def at_least_one(self) -> "PromptsUpdate":
        if self.stage1 is None and self.stage2 is None:
            raise ValueError("at least one of stage1 or stage2 must be provided")
        return self


@router.get("")
def get_prompts(request: Request) -> dict[str, str | None]:
    return _read(_prompts_path(request))


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
def put_prompts(payload: PromptsUpdate, request: Request) -> None:
    path = _prompts_path(request)
    current = _read(path)
    merged = {
        "stage1": payload.stage1 if payload.stage1 is not None else current.get("stage1"),
        "stage2": payload.stage2 if payload.stage2 is not None else current.get("stage2"),
    }
    # Remove None values so the file only has set keys
    merged = {k: v for k, v in merged.items() if v is not None}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(merged))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompts(request: Request) -> None:
    path = _prompts_path(request)
    if path.is_file():
        path.unlink()
