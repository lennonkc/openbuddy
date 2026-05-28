from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    TextBlock,
    ToolUseBlock,
)

from openbuddy.agent.env import inject_llm_env

_FILE_TOOLS = {"Write", "Edit"}


@dataclass
class AgentChunk:
    text: str | None = None
    modified_file: str | None = None


if TYPE_CHECKING:
    from openbuddy.auth import AuthorizationManager

SESSION_ID = "openbuddy"


class AgentManager:
    def __init__(
        self,
        *,
        llm_config_getter: Callable[[], dict[str, str]],
        auth: AuthorizationManager | None = None,
    ) -> None:
        self._llm_config_getter = llm_config_getter
        self._auth = auth
        self._client: Any | None = None
        self._cwd: str | None = None
        self._system_prompt: str | None = None
        self._last_llm_config: tuple[str, str, str] | None = None

    async def ensure(self, *, cwd: str, system_prompt: str | None = None) -> Any:
        cfg = self._llm_config_getter()
        llm_tuple = (cfg["api_key"], cfg["base_url"], cfg["model"])
        if llm_tuple != self._last_llm_config:
            inject_llm_env(cfg["api_key"], cfg["base_url"], cfg["model"])
            self._last_llm_config = llm_tuple
            if self._client is not None:
                await self._client.disconnect()
                self._client = None
        if self._cwd == cwd and self._system_prompt == system_prompt and self._client is not None:
            return self._client
        if self._client is not None:
            await self._client.disconnect()
        opts = ClaudeAgentOptions(cwd=cwd, system_prompt=system_prompt)
        if self._auth is not None:
            opts.can_use_tool = self._auth.can_use_tool
        self._client = ClaudeSDKClient(options=opts)
        await self._client.connect()
        self._cwd = cwd
        self._system_prompt = system_prompt
        return self._client

    async def ask(
        self, prompt: str, *, cwd: str, system_prompt: str | None = None
    ) -> AsyncIterator[AgentChunk]:
        client = await self.ensure(cwd=cwd, system_prompt=system_prompt)
        await client.query(prompt, session_id=SESSION_ID)
        async for msg in client.receive_response():
            if isinstance(msg, AssistantMessage):
                for block in msg.content:
                    if isinstance(block, TextBlock):
                        yield AgentChunk(text=block.text)
                    elif isinstance(block, ToolUseBlock):
                        if block.name in _FILE_TOOLS and "file_path" in block.input:
                            yield AgentChunk(modified_file=block.input["file_path"])
