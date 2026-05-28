from typing import Annotated, Literal

from pydantic import BaseModel, Field, TypeAdapter


class ClientHello(BaseModel):
    type: Literal["hello"]
    device_id: str
    fw_version: str = ""
    device_name: str = ""


class ClientMicStart(BaseModel):
    type: Literal["mic_start"]


class ClientMicStop(BaseModel):
    type: Literal["mic_stop"]


class ClientReset(BaseModel):
    type: Literal["reset"]


class ClientAuthorizationResponse(BaseModel):
    type: Literal["authorization_response"]
    request_id: str
    approved: bool


ClientFrame = Annotated[
    ClientHello | ClientMicStart | ClientMicStop | ClientReset | ClientAuthorizationResponse,
    Field(discriminator="type"),
]

_adapter = TypeAdapter(ClientFrame)


def parse_client_frame(data: dict) -> ClientFrame:
    return _adapter.validate_python(data)


# Server → Client builders
def state_frame(state: str) -> dict:
    return {"type": "state", "state": state}


def sfx_frame(name: str) -> dict:
    return {"type": "sfx", "name": name}


def transcript_frame(text: str) -> dict:
    return {"type": "transcript", "text": text}


def assistant_text_frame(text: str) -> dict:
    return {"type": "assistant_text", "text": text}


def error_frame(code: str, message: str) -> dict:
    return {"type": "error", "code": code, "message": message}


def tts_start_frame() -> dict:
    return {"type": "tts_start"}


def tts_end_frame() -> dict:
    return {"type": "tts_end"}


def ready_frame() -> dict:
    return {"type": "ready"}


def authorization_request_frame(
    request_id: str, tool_name: str, title: str, description: str
) -> dict:
    return {
        "type": "authorization_request",
        "request_id": request_id,
        "tool_name": tool_name,
        "title": title,
        "description": description,
    }
