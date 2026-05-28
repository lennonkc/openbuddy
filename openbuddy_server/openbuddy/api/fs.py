import asyncio
import logging
import mimetypes
import re
import subprocess
import sys
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from openbuddy.api.config import get_cwd

router = APIRouter(prefix="/api/fs", tags=["fs"])
log = logging.getLogger(__name__)

MAX_RESULTS = 20
_picker_lock = threading.Lock()
_PICKER_TIMEOUT = 120


# ---------------------------------------------------------------------------
# Path validation
# ---------------------------------------------------------------------------


def _validate_path(request: Request, path_str: str) -> Path:
    """Resolve *path_str* and ensure it stays inside the configured cwd."""
    cwd = Path(get_cwd(request.app)).resolve()
    p = Path(path_str)
    if not p.is_absolute():
        p = cwd / p
    resolved = p.resolve()

    if not resolved.is_relative_to(cwd):
        raise HTTPException(403, "Path is outside the working directory")

    # Follow symlinks and re-check
    try:
        real = resolved.resolve(strict=True)
    except OSError:
        # Path does not exist — caller handles 404 later
        return resolved

    if not real.is_relative_to(cwd):
        raise HTTPException(403, "Symlink target is outside the working directory")

    return resolved


# ---------------------------------------------------------------------------
# GET /api/fs/list
# ---------------------------------------------------------------------------


@router.get("/list")
def list_dir(request: Request, path: str = Query(...)) -> dict:
    resolved = _validate_path(request, path)

    if not resolved.exists():
        raise HTTPException(404, "Path does not exist")
    if not resolved.is_dir():
        raise HTTPException(400, "Path is not a directory")

    cwd = Path(get_cwd(request.app)).resolve()
    items: list[dict] = []
    for child in resolved.iterdir():
        # Skip hidden entries
        if child.name.startswith("."):
            continue
        # Skip symlinks escaping cwd
        if child.is_symlink():
            try:
                real = child.resolve(strict=True)
            except OSError:
                continue
            if not real.is_relative_to(cwd):
                continue

        try:
            st = child.stat()
        except OSError:
            continue

        items.append(
            {
                "name": child.name,
                "type": "directory" if child.is_dir() else "file",
                "size": st.st_size,
                "mtime": st.st_mtime,
            }
        )

    # Sort: directories first, then files; each group alphabetical
    items.sort(key=lambda i: (0 if i["type"] == "directory" else 1, i["name"].lower()))
    return {"items": items}


# ---------------------------------------------------------------------------
# GET /api/fs/stat
# ---------------------------------------------------------------------------


@router.get("/stat")
def stat_path(request: Request, path: str = Query(...)) -> dict:
    resolved = _validate_path(request, path)

    if not resolved.exists():
        raise HTTPException(404, "Path does not exist")

    st = resolved.stat()
    is_dir = resolved.is_dir()
    mime = None if is_dir else (mimetypes.guess_type(resolved.name)[0])

    return {
        "name": resolved.name,
        "type": "directory" if is_dir else "file",
        "size": st.st_size,
        "mtime": st.st_mtime,
        "mime": mime,
    }


# ---------------------------------------------------------------------------
# GET /api/fs/read
# ---------------------------------------------------------------------------

_MAX_TEXT_BYTES = 1024 * 1024  # 1 MB

_TEXT_EXTENSIONS: set[str] = {
    ".py",
    ".pyi",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".scss",
    ".html",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".md",
    ".txt",
    ".sh",
    ".bash",
    ".zsh",
    ".c",
    ".h",
    ".cpp",
    ".hpp",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".swift",
    ".rb",
    ".lua",
    ".sql",
    ".xml",
    ".csv",
    ".ini",
    ".cfg",
    ".env",
    ".gitignore",
    ".dockerfile",
    ".makefile",
    ".cmake",
    ".proto",
    ".graphql",
    ".vue",
    ".svelte",
    ".svg",
    ".puml",
    ".plantuml",
    ".pu",
    ".wsd",
    ".mdx",
    ".php",
    ".log",
}


def _is_text(path: Path) -> bool:
    """Heuristic: known text extension or text/* MIME type."""
    if path.suffix.lower() in _TEXT_EXTENSIONS:
        return True
    if path.name.lower() in {"makefile", "dockerfile", "cmakelists.txt"}:
        return True
    mime = mimetypes.guess_type(path.name)[0]
    return mime is not None and mime.startswith("text/")


@router.get("/read")
def read_file(request: Request, path: str = Query(...)):
    resolved = _validate_path(request, path)

    if not resolved.exists():
        raise HTTPException(404, "Path does not exist")
    if not resolved.is_file():
        raise HTTPException(400, "Path is not a file")

    if _is_text(resolved):
        raw = resolved.read_bytes()
        truncated = len(raw) > _MAX_TEXT_BYTES
        text = raw[:_MAX_TEXT_BYTES].decode("utf-8", errors="replace")
        return {"content": text, "truncated": truncated}

    # Binary file — stream with correct Content-Type
    mime = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"

    def _iter():
        with open(resolved, "rb") as f:
            while chunk := f.read(65536):
                yield chunk

    return StreamingResponse(_iter(), media_type=mime)


class PickDirectoryRequest(BaseModel):
    default_path: str | None = None


class PickDirectoryResponse(BaseModel):
    path: str | None = None
    cancelled: bool = False


@router.get("/suggest")
def suggest(prefix: str = Query(...)) -> dict[str, list[str]]:
    p = Path(prefix).expanduser()
    parent = p if prefix.endswith("/") else p.parent
    leaf = "" if prefix.endswith("/") else p.name
    if not parent.is_dir():
        return {"items": []}
    matches = sorted(
        child.name for child in parent.iterdir() if child.is_dir() and child.name.startswith(leaf)
    )
    return {"items": matches[:MAX_RESULTS]}


@router.post("/pick-directory")
async def pick_directory(body: PickDirectoryRequest | None = None) -> PickDirectoryResponse:
    if sys.platform != "darwin":
        raise HTTPException(501, "Native directory picker is only available on macOS")
    if not _picker_lock.acquire(blocking=False):
        raise HTTPException(409, "A directory picker dialog is already open")
    try:
        return await asyncio.to_thread(_run_picker, body)
    finally:
        _picker_lock.release()


def _run_picker(body: PickDirectoryRequest | None) -> PickDirectoryResponse:
    script = 'POSIX path of (choose folder with prompt "选择工作目录"'
    if body and body.default_path:
        default = Path(body.default_path).expanduser()
        if re.search(r"[\x00-\x1f\x7f]", str(default)):
            log.warning("Rejected default_path with control characters: %r", body.default_path)
        elif default.is_dir():
            safe = str(default).replace("\\", "\\\\").replace('"', '\\"')
            script += f' default location POSIX file "{safe}"'
    script += ")"

    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=_PICKER_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return PickDirectoryResponse(cancelled=True)
    except FileNotFoundError:
        raise HTTPException(501, "osascript not found")

    if result.returncode != 0:
        if "User canceled" in result.stderr or "-128" in result.stderr:
            return PickDirectoryResponse(cancelled=True)
        log.error("osascript failed: %s", result.stderr.strip())
        raise HTTPException(500, "目录选择器异常退出")

    chosen = result.stdout.strip().rstrip("/")
    if not chosen or not Path(chosen).is_dir():
        log.error("osascript returned invalid path: %r", chosen)
        raise HTTPException(500, "返回的路径无效")

    return PickDirectoryResponse(path=chosen)
