import asyncio
import re

import httpx
from anthropic import Anthropic, APIStatusError, APITimeoutError

DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/apps/anthropic"
QWEN_MODEL = "qwen3.6-flash"
MAX_TOKENS = 256
TIMEOUT_S = 5.0

_CJK_RE = re.compile(r"[一-鿿㐀-䶿]")

SYSTEM_USER_INPUT_ZH = (
    "你是一个文本风格化助手。把用户口语化的原话改写成自然的书面句法，"
    "只去掉重复和无意义的填充词（嗯、啊、那个、就是），保留原句结构和语序。"
    "不要重组句子，不要添加新信息，不要询问，不要解释。只输出改写后的句子。"
)

SYSTEM_USER_INPUT_EN = (
    "You are a text normalizer. Rewrite the user's casual spoken input into natural "
    "written form. Only remove filler words (um, uh, like, you know) and fix grammar. "
    "Keep the original sentence structure and word order. Do not restructure, add "
    "information, ask questions, or explain. Output only the rewritten sentence."
)

SYSTEM_ASSISTANT_TEXT_ZH = (
    "你是一个文本压缩助手。把下面这段助手回复压缩为一句口语化短句，"
    "目标50字以内，适合喇叭朗读。只保留核心结论，删掉解释和修饰。"
    "不要添加新信息，不要询问。只输出压缩后的文本。"
)

SYSTEM_ASSISTANT_TEXT_EN = (
    "You are a text compressor. Compress the assistant reply below into one short "
    "spoken sentence, under 120 characters, suitable for a tiny speaker. Keep only "
    "the core conclusion — remove explanations and decorations. Do not add new "
    "information or ask questions. Output only the compressed text."
)


def _pick_system(text: str, zh: str, en: str) -> str:
    return zh if _CJK_RE.search(text) else en


class QwenCleanupError(RuntimeError):
    pass


_clients: dict[str, Anthropic] = {}


def _get_client(api_key: str) -> Anthropic:
    if api_key not in _clients:
        _clients[api_key] = Anthropic(
            api_key=api_key,
            base_url=DASHSCOPE_BASE,
            timeout=TIMEOUT_S,
        )
    return _clients[api_key]


async def _call(text: str, *, system: str, api_key: str) -> str:
    last_exc: Exception | None = None
    for _attempt in range(2):
        try:
            # anthropic SDK 是同步的；用 httpx async 直连兼容端点更顺，
            # 此处仍走原生 SDK 以保证未来 schema 跟进。包一层 to_thread。
            def _sync() -> str:
                client = _get_client(api_key)
                msg = client.messages.create(
                    model=QWEN_MODEL,
                    max_tokens=MAX_TOKENS,
                    system=system,
                    messages=[{"role": "user", "content": text}],
                    extra_body={"thinking": {"type": "disabled"}},
                )
                return msg.content[0].text  # type: ignore[union-attr]

            return await asyncio.to_thread(_sync)
        except (
            httpx.TimeoutException,
            httpx.HTTPStatusError,
            APITimeoutError,
            APIStatusError,
        ) as e:  # noqa: E501
            last_exc = e
            continue
    raise QwenCleanupError(str(last_exc))


async def cleanup_user_input(
    text: str,
    *,
    api_key: str,
    custom_system: str | None = None,
) -> str:
    system = custom_system or _pick_system(text, SYSTEM_USER_INPUT_ZH, SYSTEM_USER_INPUT_EN)
    return await _call(text, system=system, api_key=api_key)


async def cleanup_assistant_text(
    text: str,
    *,
    api_key: str,
    custom_system: str | None = None,
) -> str:
    system = custom_system or _pick_system(text, SYSTEM_ASSISTANT_TEXT_ZH, SYSTEM_ASSISTANT_TEXT_EN)
    return await _call(text, system=system, api_key=api_key)
