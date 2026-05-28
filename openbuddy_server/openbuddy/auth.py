import asyncio
import logging
import time
import uuid
from pathlib import Path
from typing import Any

from claude_agent_sdk import (
    PermissionResult,
    PermissionResultAllow,
    PermissionResultDeny,
    ToolPermissionContext,
)

from openbuddy.api.permissions import PermissionsConfig, ToolPolicy, read_permissions
from openbuddy.events import EventBus
from openbuddy.ws.protocol import authorization_request_frame

log = logging.getLogger(__name__)

AUTH_TIMEOUT_S = 60


class AuthorizationManager:
    _CACHE_TTL = 2.0

    def __init__(self, bus: EventBus, *, config_dir: Path | None = None) -> None:
        self._bus = bus
        self._config_dir = config_dir
        self._pending: dict[str, asyncio.Future[bool]] = {}
        self._cached_config: PermissionsConfig | None = None
        self._cache_time: float = 0.0

    def _get_config(self) -> PermissionsConfig | None:
        if not self._config_dir:
            return None
        now = time.monotonic()
        if self._cached_config is not None and (now - self._cache_time) < self._CACHE_TTL:
            return self._cached_config
        config = read_permissions(self._config_dir)
        self._cached_config = config
        self._cache_time = now
        return config

    async def can_use_tool(
        self,
        tool_name: str,
        tool_input: dict[str, Any],
        context: ToolPermissionContext,
    ) -> PermissionResult:
        config = self._get_config()

        if config is not None:
            tool_cfg = config.tools.get(tool_name.lower())
            if tool_cfg is not None:
                if not tool_cfg.enabled:
                    return PermissionResultDeny(message="Tool disabled by policy")
                if tool_cfg.policy == ToolPolicy.ALWAYS_ALLOW:
                    return PermissionResultAllow()
            elif config.default_policy == ToolPolicy.ALWAYS_ALLOW:
                return PermissionResultAllow()

        timeout = config.timeout_seconds if config else AUTH_TIMEOUT_S
        deny_interrupts = config.deny_interrupts if config else False

        request_id = uuid.uuid4().hex[:8]
        loop = asyncio.get_running_loop()
        fut: asyncio.Future[bool] = loop.create_future()
        self._pending[request_id] = fut

        await self._bus.publish(
            authorization_request_frame(
                request_id=request_id,
                tool_name=tool_name,
                title=context.title or tool_name,
                description=context.description or "",
            )
        )
        log.info("authorization request %s for tool %s", request_id, tool_name)

        try:
            approved = await asyncio.wait_for(fut, timeout=timeout)
        except TimeoutError:
            log.warning("authorization %s timed out", request_id)
            return PermissionResultDeny(
                message="Authorization timed out", interrupt=deny_interrupts
            )
        finally:
            self._pending.pop(request_id, None)

        if approved:
            log.info("authorization %s approved", request_id)
            return PermissionResultAllow()
        log.info("authorization %s denied", request_id)
        return PermissionResultDeny(message="Denied by user", interrupt=deny_interrupts)

    def resolve(self, request_id: str, approved: bool) -> None:
        fut = self._pending.get(request_id)
        if fut is not None and not fut.done():
            fut.set_result(approved)
        else:
            log.warning("no pending authorization for %s", request_id)
