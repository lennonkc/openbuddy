"""手动 smoke：需设置 MINIMAX_API_KEY env。

pytest tests/smoke/test_m27_smoke.py -v -s
"""

import os

import pytest

from openbuddy.agent.lifecycle import AgentManager

pytestmark = pytest.mark.skipif(
    not os.environ.get("MINIMAX_API_KEY"),
    reason="set MINIMAX_API_KEY to run M2.7 smoke",
)


async def test_m27_roundtrip(tmp_path):
    mgr = AgentManager(
        llm_config_getter=lambda: {
            "api_key": os.environ["MINIMAX_API_KEY"],
            "base_url": "https://api.minimaxi.com/anthropic",
            "model": "MiniMax-M2.7",
        }
    )
    chunks: list[str] = []
    async for piece in mgr.ask("说一句 hello", cwd=str(tmp_path)):
        chunks.append(piece)
    joined = "".join(chunks)
    assert joined.strip(), "M2.7 should return some text"
    print("M2.7 reply:", joined)
