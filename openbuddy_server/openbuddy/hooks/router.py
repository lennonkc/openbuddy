from fastapi import APIRouter, HTTPException, Request, status

router = APIRouter(prefix="/hooks", tags=["hooks"])

ALLOWED_HOSTS = {"127.0.0.1", "localhost", "testclient"}


@router.post("/{name}")
async def receive_hook(name: str, request: Request) -> dict:
    client_host = request.client.host if request.client else ""
    if client_host not in ALLOWED_HOSTS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "hooks: localhost only")
    payload = await request.json()
    session_id = payload.get("session_id", "")
    if session_id != "openbuddy":
        return {"status": "filtered"}
    bus = request.app.state.event_bus
    await bus.publish(
        {
            "type": "hook",
            "name": name,
            "event": payload.get("hook_event_name", name),
            "tool_name": payload.get("tool_name"),
        }
    )
    if name == "Stop":
        await bus.publish({"type": "sfx", "name": "done"})
    return {"status": "accepted"}
