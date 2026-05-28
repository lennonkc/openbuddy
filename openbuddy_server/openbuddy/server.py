import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from openbuddy.agent.env import DEFAULT_BASE_URL, DEFAULT_MODEL
from openbuddy.agent.lifecycle import AgentManager
from openbuddy.api import agent_prompt as api_agent_prompt
from openbuddy.api import auth as api_auth
from openbuddy.api import config as api_config
from openbuddy.api import devices as api_devices
from openbuddy.api import fs as api_fs
from openbuddy.api import history as api_history
from openbuddy.api import keys as api_keys
from openbuddy.api import llm_config as api_llm_config
from openbuddy.api import permissions as api_permissions
from openbuddy.api import prompts as api_prompts
from openbuddy.api.llm_config import read_llm_config
from openbuddy.auth import AuthorizationManager
from openbuddy.config import Settings
from openbuddy.db import init_db
from openbuddy.events import EventBus
from openbuddy.history import ChatHistory
from openbuddy.hooks import router as hooks_router
from openbuddy.keychain import KeyName, KeyStore
from openbuddy.log import setup_logging
from openbuddy.mdns import register_mdns, unregister_mdns
from openbuddy.ws import cardputer as ws_cardputer
from openbuddy.ws import webui as ws_webui

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings()
    settings.ensure_dirs()
    setup_logging(settings.log_dir)
    app.state.settings = settings

    bus = EventBus()
    auth_manager = AuthorizationManager(bus, config_dir=settings.config_dir)
    app.state.event_bus = bus
    app.state.auth_manager = auth_manager

    def _get_llm_config() -> dict[str, str]:
        cfg = read_llm_config(settings.config_dir)
        ks = KeyStore()
        api_key = ks.require(KeyName.LLM)
        return {
            "base_url": cfg["base_url"] or DEFAULT_BASE_URL,
            "model": cfg["model"] or DEFAULT_MODEL,
            "api_key": api_key,
        }

    app.state.agent_manager = AgentManager(
        llm_config_getter=_get_llm_config,
        auth=auth_manager,
    )

    engine, session_factory = await init_db(settings.config_dir / "history.db")
    app.state.chat_history = ChatHistory(session_factory)
    await app.state.chat_history.init()

    zc = None
    zc_info = None
    try:
        zc, zc_info, mdns_info = await register_mdns(settings.port)
        app.state.mdns_info = mdns_info
    except Exception:
        log.warning("mDNS registration failed; service discovery will be unavailable")
    yield
    if zc is not None and zc_info is not None:
        await unregister_mdns(zc, zc_info)
    await engine.dispose()


app = FastAPI(title="OpenBuddy Server", version="0.1.0", lifespan=lifespan)

app.include_router(api_auth.router)
app.include_router(api_config.router)
app.include_router(api_fs.router)
app.include_router(api_keys.router)
app.include_router(api_llm_config.router)
app.include_router(api_permissions.router)
app.include_router(api_prompts.router)
app.include_router(api_agent_prompt.router)
app.include_router(api_devices.router)
app.include_router(ws_cardputer.router)
app.include_router(ws_webui.router)
app.include_router(hooks_router.router)
app.include_router(api_history.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


_dist = Path(__file__).resolve().parents[2] / "openbuddy_webui" / "dist"
if _dist.is_dir():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="webui")
