from enum import StrEnum

import keyring

SERVICE = "openbuddy"


class KeyName(StrEnum):
    ELEVENLABS = "elevenlabs"
    DASHSCOPE = "dashscope"
    LLM = "llm"


class KeyStore:
    def get(self, name: KeyName) -> str | None:
        return keyring.get_password(SERVICE, name.value)

    def set(self, name: KeyName, value: str) -> None:
        keyring.set_password(SERVICE, name.value, value)

    def delete(self, name: KeyName) -> None:
        keyring.delete_password(SERVICE, name.value)

    def require(self, name: KeyName) -> str:
        v = self.get(name)
        if not v:
            raise RuntimeError(f"missing key: {name.value}")
        return v

    def redacted(self) -> dict[str, str | None]:
        out: dict[str, str | None] = {}
        for k in KeyName:
            v = self.get(k)
            out[k.value] = f"sk-***{v[-4:]}" if v else None
        return out
