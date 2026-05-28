import asyncio
import json
import logging
import time
from pathlib import Path

from openbuddy.agent.scrub import scrub_assistant_text
from openbuddy.api.agent_prompt import read_agent_prompt
from openbuddy.events import EventBus
from openbuddy.history import ChatHistory
from openbuddy.keychain import KeyName, KeyStore
from openbuddy.voice.qwen import (
    QwenCleanupError,
    cleanup_assistant_text,
    cleanup_user_input,
)
from openbuddy.voice.sanitize import sanitize_transcript
from openbuddy.voice.stt import transcribe
from openbuddy.voice.tts import synthesize

log = logging.getLogger(__name__)


async def run_pipeline(
    *,
    pcm: bytes,
    cwd: str,
    agent,
    keys: KeyStore,
    bus: EventBus,
    prompts_path: Path | None = None,
    agent_prompt_path: Path | None = None,
    history: ChatHistory | None = None,
) -> None:
    # Yield once so any subscriber tasks scheduled before run_pipeline can
    # register with the bus before the first publish.
    await asyncio.sleep(0)
    try:
        await bus.publish({"type": "state", "state": "thinking"})

        duration_s = len(pcm) / 32000
        log.info("pipeline: PCM in = %d bytes (%.2fs @ 16kHz mono)", len(pcm), duration_s)
        if duration_s < 0.5:
            log.warning("pipeline: audio too short (%.2fs < 0.5s), skipping", duration_s)
            await bus.publish({"type": "state", "state": "idle"})
            return
        t0 = time.monotonic()
        raw = await transcribe(pcm, api_key=keys.require(KeyName.ELEVENLABS))
        log.info("pipeline: STT done in %.2fs, text=%r", time.monotonic() - t0, raw[:120])
        raw = sanitize_transcript(raw)
        await bus.publish({"type": "transcript", "text": raw})

        # Read custom prompts if available
        custom_stage1 = None
        custom_stage2 = None
        if prompts_path is not None and prompts_path.is_file():
            try:
                pdata = json.loads(prompts_path.read_text())
                custom_stage1 = pdata.get("stage1")
                custom_stage2 = pdata.get("stage2")
            except (json.JSONDecodeError, OSError):
                pass

        t0 = time.monotonic()
        cleaned_in = await cleanup_user_input(
            raw,
            api_key=keys.require(KeyName.DASHSCOPE),
            custom_system=custom_stage1,
        )
        log.info("pipeline: Qwen-in done in %.2fs", time.monotonic() - t0)

        # Chat event: user message with raw + cleaned
        conv_id, msg_id = None, None
        if history is not None:
            try:
                conv_id, msg_id = await history.save_user_message(raw=raw, display=cleaned_in)
            except Exception:
                log.warning("failed to save user message to history", exc_info=True)
        await bus.publish(
            {
                "type": "user_message",
                "raw": raw,
                "cleaned": cleaned_in,
                "conversation_id": conv_id,
                "message_id": msg_id,
            }
        )

        agent_system_prompt = read_agent_prompt(agent_prompt_path) if agent_prompt_path else None

        agent_text_parts: list[str] = []
        modified_files: list[str] = []
        seen_files: set[str] = set()
        t0 = time.monotonic()
        async for chunk in agent.ask(cleaned_in, cwd=cwd, system_prompt=agent_system_prompt):
            if chunk.text:
                agent_text_parts.append(chunk.text)
            if chunk.modified_file and chunk.modified_file not in seen_files:
                seen_files.add(chunk.modified_file)
                modified_files.append(chunk.modified_file)
        full = "".join(agent_text_parts)
        log.info("pipeline: Agent done in %.2fs, %d chars", time.monotonic() - t0, len(full))

        scrubbed = scrub_assistant_text(full)
        await bus.publish({"type": "assistant_text", "text": scrubbed})
        log.info(
            "pipeline: assistant_text (scrubbed) %d chars: %r",
            len(scrubbed),
            scrubbed[:120],
        )

        t0 = time.monotonic()
        spoken = await cleanup_assistant_text(
            scrubbed,
            api_key=keys.require(KeyName.DASHSCOPE),
            custom_system=custom_stage2,
        )
        log.info(
            "pipeline: Qwen-out done in %.2fs, spoken %d chars: %r",
            time.monotonic() - t0,
            len(spoken),
            spoken[:120],
        )
        # 让 webui 能看到 dashscope 口语化结果（TTS 朗读的真实文本）。
        await bus.publish({"type": "spoken_text", "text": spoken})

        # Chat event: agent message with raw + spoken
        conv_id, msg_id = None, None
        if history is not None:
            try:
                conv_id, msg_id = await history.save_assistant_message(
                    raw=scrubbed,
                    display=spoken,
                    modified_files=modified_files or None,
                )
            except Exception:
                log.warning("failed to save assistant message to history", exc_info=True)
        await bus.publish(
            {
                "type": "agent_message",
                "raw": scrubbed,
                "spoken": spoken,
                "conversation_id": conv_id,
                "message_id": msg_id,
                "modified_files": modified_files or None,
            }
        )

        t0 = time.monotonic()
        pcm_out = await synthesize(spoken, api_key=keys.require(KeyName.ELEVENLABS))
        log.info(
            "pipeline: TTS done in %.2fs, %d bytes PCM out", time.monotonic() - t0, len(pcm_out)
        )

        await bus.publish({"type": "tts_start"})
        await bus.publish({"type": "tts_pcm", "pcm": pcm_out})
        await bus.publish({"type": "tts_end"})
        await bus.publish({"type": "state", "state": "idle"})

    except QwenCleanupError as e:
        log.warning("pipeline failed at Qwen: %s", e)
        await bus.publish(
            {
                "type": "error",
                "code": "qwen_failure",
                "message": str(e),
            }
        )
        await bus.publish({"type": "state", "state": "error"})
    except Exception as e:
        log.exception("pipeline failure")
        await bus.publish(
            {
                "type": "error",
                "code": "pipeline_failure",
                "message": str(e),
            }
        )
        await bus.publish({"type": "state", "state": "error"})
