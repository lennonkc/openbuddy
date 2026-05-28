import asyncio
import json
from pathlib import Path

import pytest

from openbuddy.auth import AuthorizationManager
from openbuddy.events import EventBus
from openbuddy.ws.protocol import ClientAuthorizationResponse, parse_client_frame


@pytest.fixture
def bus():
    return EventBus()


@pytest.fixture
def auth(bus):
    return AuthorizationManager(bus)


def test_parse_authorization_response():
    f = parse_client_frame(
        {"type": "authorization_response", "request_id": "abc123", "approved": True}
    )
    assert isinstance(f, ClientAuthorizationResponse)
    assert f.request_id == "abc123"
    assert f.approved is True


def test_parse_authorization_response_deny():
    f = parse_client_frame(
        {"type": "authorization_response", "request_id": "xyz", "approved": False}
    )
    assert isinstance(f, ClientAuthorizationResponse)
    assert f.approved is False


async def test_approve_flow(auth, bus):
    captured = []

    async def collector():
        async with bus.subscribe() as q:
            msg = await q.get()
            captured.append(msg)

    task = asyncio.create_task(collector())
    await asyncio.sleep(0)

    async def approve_after_delay():
        await asyncio.sleep(0.05)
        assert len(captured) == 1
        request_id = captured[0]["request_id"]
        auth.resolve(request_id, approved=True)

    approve_task = asyncio.create_task(approve_after_delay())

    from claude_agent_sdk import PermissionResultAllow, ToolPermissionContext

    ctx = ToolPermissionContext(title="Write file foo.txt", description="Creates a new file")
    result = await auth.can_use_tool("Write", {"file_path": "foo.txt"}, ctx)

    assert isinstance(result, PermissionResultAllow)
    assert captured[0]["type"] == "authorization_request"
    assert captured[0]["tool_name"] == "Write"
    assert captured[0]["title"] == "Write file foo.txt"

    task.cancel()
    await approve_task


async def test_deny_flow(auth, bus):
    async def deny_after_delay():
        await asyncio.sleep(0.05)
        for rid in list(auth._pending):
            auth.resolve(rid, approved=False)

    asyncio.create_task(deny_after_delay())

    from claude_agent_sdk import PermissionResultDeny, ToolPermissionContext

    ctx = ToolPermissionContext()
    result = await auth.can_use_tool("Bash", {"command": "rm -rf /"}, ctx)

    assert isinstance(result, PermissionResultDeny)
    assert "Denied" in result.message


async def test_timeout_flow(auth):
    import openbuddy.auth as auth_mod

    original = auth_mod.AUTH_TIMEOUT_S
    auth_mod.AUTH_TIMEOUT_S = 0.1
    try:
        from claude_agent_sdk import PermissionResultDeny, ToolPermissionContext

        ctx = ToolPermissionContext()
        result = await auth.can_use_tool("Edit", {}, ctx)
        assert isinstance(result, PermissionResultDeny)
        assert "timed out" in result.message
    finally:
        auth_mod.AUTH_TIMEOUT_S = original


async def test_resolve_unknown_request(auth):
    auth.resolve("nonexistent", approved=True)


# --- Policy-based authorization tests ---


@pytest.fixture
def config_dir(tmp_path):
    return tmp_path


def _write_perms(config_dir: Path, perms: dict) -> None:
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "permissions.json").write_text(json.dumps(perms))


@pytest.fixture
def policy_auth(bus, config_dir):
    return AuthorizationManager(bus, config_dir=config_dir)


async def test_always_allow_skips_approval(policy_auth, config_dir, bus):
    _write_perms(
        config_dir,
        {
            "default_policy": "always_ask",
            "timeout_seconds": 60,
            "deny_interrupts": False,
            "tools": {"read": {"enabled": True, "policy": "always_allow"}},
        },
    )

    from claude_agent_sdk import PermissionResultAllow, ToolPermissionContext

    ctx = ToolPermissionContext(title="Read file")
    result = await policy_auth.can_use_tool("Read", {"file_path": "foo.txt"}, ctx)
    assert isinstance(result, PermissionResultAllow)


async def test_disabled_tool_denied(policy_auth, config_dir):
    _write_perms(
        config_dir,
        {
            "default_policy": "always_ask",
            "timeout_seconds": 60,
            "deny_interrupts": False,
            "tools": {"bash": {"enabled": False, "policy": "always_ask"}},
        },
    )

    from claude_agent_sdk import PermissionResultDeny, ToolPermissionContext

    ctx = ToolPermissionContext(title="Run command")
    result = await policy_auth.can_use_tool("Bash", {"command": "ls"}, ctx)
    assert isinstance(result, PermissionResultDeny)
    assert "disabled" in result.message.lower()


async def test_unknown_tool_uses_default_policy(policy_auth, config_dir):
    _write_perms(
        config_dir,
        {
            "default_policy": "always_allow",
            "timeout_seconds": 60,
            "deny_interrupts": False,
            "tools": {},
        },
    )

    from claude_agent_sdk import PermissionResultAllow, ToolPermissionContext

    ctx = ToolPermissionContext()
    result = await policy_auth.can_use_tool("SomeNewTool", {}, ctx)
    assert isinstance(result, PermissionResultAllow)


async def test_always_ask_with_config_still_prompts(policy_auth, config_dir):
    _write_perms(
        config_dir,
        {
            "default_policy": "always_ask",
            "timeout_seconds": 60,
            "deny_interrupts": False,
            "tools": {"edit": {"enabled": True, "policy": "always_ask"}},
        },
    )

    async def approve_soon():
        await asyncio.sleep(0.05)
        for rid in list(policy_auth._pending):
            policy_auth.resolve(rid, approved=True)

    asyncio.create_task(approve_soon())

    from claude_agent_sdk import PermissionResultAllow, ToolPermissionContext

    ctx = ToolPermissionContext(title="Edit file")
    result = await policy_auth.can_use_tool("Edit", {}, ctx)
    assert isinstance(result, PermissionResultAllow)


async def test_deny_interrupts_flag(policy_auth, config_dir):
    _write_perms(
        config_dir,
        {
            "default_policy": "always_ask",
            "timeout_seconds": 60,
            "deny_interrupts": True,
            "tools": {"write": {"enabled": True, "policy": "always_ask"}},
        },
    )

    async def deny_soon():
        await asyncio.sleep(0.05)
        for rid in list(policy_auth._pending):
            policy_auth.resolve(rid, approved=False)

    asyncio.create_task(deny_soon())

    from claude_agent_sdk import PermissionResultDeny, ToolPermissionContext

    ctx = ToolPermissionContext()
    result = await policy_auth.can_use_tool("Write", {}, ctx)
    assert isinstance(result, PermissionResultDeny)
    assert result.interrupt is True


async def test_disabled_overrides_always_allow(policy_auth, config_dir):
    _write_perms(
        config_dir,
        {
            "default_policy": "always_allow",
            "timeout_seconds": 60,
            "deny_interrupts": False,
            "tools": {"bash": {"enabled": False, "policy": "always_allow"}},
        },
    )

    from claude_agent_sdk import PermissionResultDeny, ToolPermissionContext

    ctx = ToolPermissionContext(title="Run command")
    result = await policy_auth.can_use_tool("Bash", {}, ctx)
    assert isinstance(result, PermissionResultDeny)
    assert "disabled" in result.message.lower()


async def test_no_config_dir_falls_back_to_always_ask(bus):
    auth_no_config = AuthorizationManager(bus)

    async def approve_soon():
        await asyncio.sleep(0.05)
        for rid in list(auth_no_config._pending):
            auth_no_config.resolve(rid, approved=True)

    asyncio.create_task(approve_soon())

    from claude_agent_sdk import PermissionResultAllow, ToolPermissionContext

    ctx = ToolPermissionContext(title="Test")
    result = await auth_no_config.can_use_tool("Anything", {}, ctx)
    assert isinstance(result, PermissionResultAllow)
