from fastapi import APIRouter, status
from pydantic import BaseModel, field_validator

from openbuddy.keychain import KeyName, KeyStore

router = APIRouter(prefix="/api/keys", tags=["keys"])


class KeyUpdate(BaseModel):
    name: str
    value: str

    @field_validator("name")
    @classmethod
    def known_name(cls, v: str) -> str:
        if v not in {k.value for k in KeyName}:
            raise ValueError(f"unknown key name: {v}")
        return v


@router.get("")
def list_keys() -> dict[str, str | None]:
    return KeyStore().redacted()


@router.put("", status_code=status.HTTP_204_NO_CONTENT)
def update_key(payload: KeyUpdate) -> None:
    KeyStore().set(KeyName(payload.name), payload.value)
