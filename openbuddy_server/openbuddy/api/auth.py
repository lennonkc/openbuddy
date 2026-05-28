from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _check_localhost(request: Request) -> None:
    host = request.client.host if request.client else ""
    if host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="localhost only")


@router.post("/{request_id}/approve")
async def approve(request_id: str, request: Request) -> dict:
    _check_localhost(request)
    request.app.state.auth_manager.resolve(request_id, approved=True)
    return {"status": "approved"}


@router.post("/{request_id}/deny")
async def deny(request_id: str, request: Request) -> dict:
    _check_localhost(request)
    request.app.state.auth_manager.resolve(request_id, approved=False)
    return {"status": "denied"}
