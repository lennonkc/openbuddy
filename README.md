<p align="center">
  <a href=".github/README.zh.md">中文</a> ·
  <a href=".github/README.ja.md">日本語</a> ·
  <a href=".github/README.es.md">Español</a> ·
  <a href=".github/README.fr.md">Français</a>
</p>

<p align="center">
  <img src=".github/assets/openbuddy-logo.svg" alt="OpenBuddy Logo" width="120">
</p>

<h1 align="center">OpenBuddy</h1>

<p align="center">
  <em>A funny and easy AI — bring the most powerful tools to the most curious minds</em>
</p>

<p align="center">
  <a href="https://openbuddy.fun"><img src="https://img.shields.io/badge/🌐_Website-openbuddy.fun-4CD5C3?style=flat-square" alt="Website"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.11+">
  <img src="https://img.shields.io/badge/ESP--IDF-5.4%2F5.5-E7352C?style=flat-square&logo=espressif&logoColor=white" alt="ESP-IDF">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/Platform-macOS-999?style=flat-square&logo=apple&logoColor=white" alt="macOS">
</p>

<p align="center">
  <a href="https://youtu.be/PxPKkh4E9-Y">
    <img src="https://img.youtube.com/vi/PxPKkh4E9-Y/maxresdefault.jpg" alt="OpenBuddy Demo Video" width="640">
  </a>
  <br>
  <em>▶ <a href="https://youtu.be/PxPKkh4E9-Y">Watch the demo on YouTube</a></em>
</p>

---

## What is OpenBuddy?

OpenBuddy is a Claude Code desk pet system built on **M5Stack ESP32-S3** devices. It brings AI-powered voice interaction to your desktop through a cute animated companion that listens, thinks, and speaks — all driven by Claude Code under the hood.

Two hardware variants are supported: **Cardputer** (rectangular LCD) and **StopWatch** (circular AMOLED). A three-layer architecture — ESP32 firmware ↔ Python backend ↔ React WebUI — connects everything in real time via WebSocket.

## Features

- 🗣️ **Voice-First Interaction** — press a button, speak naturally, get a spoken response. Full STT → Agent → TTS pipeline
- 🐾 **Desk Pet Animation** — 6 animated states: idle, listening, thinking, speaking, error, disconnected
- 🔌 **Claude Code Integration** — hooks into Claude Code lifecycle events (Stop, PreToolUse, PostToolUse, Notification) in real time
- 🌐 **Web Dashboard** — configure settings, view live chat transcripts, explore files, manage prompts
- 📡 **Auto-Discovery** — mDNS service discovery via `openbuddy.local`, zero manual IP configuration
- 🎯 **Dual Device Support** — one server powers both Cardputer and StopWatch simultaneously
- 🔊 **Bilingual Voice** — auto-selects Chinese or English voice based on text content

## Architecture

```
┌─────────────┐       WebSocket        ┌─────────────────┐       WebSocket       ┌─────────────┐
│  ESP32       │◄──── /ws/openbuddy ───►│  Python Server   │◄──── /ws/webui ──────►│  React       │
│  Device      │      (binary+JSON)     │  (FastAPI)       │      (JSON events)    │  WebUI       │
└─────────────┘                         └────────┬────────┘                        └─────────────┘
                                                 │
                                          Voice Pipeline
                                                 │
                             ┌───────────────────┼───────────────────┐
                             ▼                   ▼                   ▼
                     ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                     │ STT          │   │ Agent        │   │ TTS          │
                     │ ElevenLabs   │──►│ LLM via      │──►│ ElevenLabs   │
                     │ Scribe v2   │   │ claude-agent  │   │ Eleven v3    │
                     └──────────────┘   │ -sdk         │   │ PCM16/16kHz  │
                                        └──────────────┘   └──────────────┘
```

**Voice Pipeline (F3 Chain):**

```
🎤 Mic → STT (ElevenLabs Scribe v2) → Qwen Cleanup → Agent → Qwen Cleanup → TTS (ElevenLabs v3) → 🔊 Speaker
```

## Supported Devices

| Feature | Cardputer | StopWatch |
|---------|-----------|-----------|
| Display | 1.14" ST7789 LCD 320×240 | Circular AMOLED |
| Flash | 8 MB | 16 MB |
| PSRAM | — | External OCT 80 MHz |
| UI Framework | smooth_ui_toolkit | LVGL v9 |
| Audio Codec | ES8311 (I²S) | ES8311 (I²S) |
| ESP-IDF | 5.4.2 | 5.5.4 |

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/lennonkc/openbuddy.git
cd openbuddy
```

### 2. Start the server and WebUI

```bash
make dev
# Server on :8000 · WebUI on :5173
```

### 3. Configure API keys

Open http://localhost:5173 → **Settings** panel, or use the CLI:

```bash
keyring set openbuddy elevenlabs <key>   # STT + TTS
keyring set openbuddy dashscope <key>    # Qwen text cleanup
keyring set openbuddy llm <key>          # Agent LLM
```

### 4. Set up Claude Code hooks

Add the following to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{ "matcher": "", "hooks": [{
      "type": "command",
      "command": "curl -m 1 -X POST -H 'Content-Type: application/json' -d @- http://127.0.0.1:8000/hooks/Stop &"
    }]}]
  }
}
```

Apply the same pattern for `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Notification`, and `SessionStart`. The `Stop` hook must be fire-and-forget (short timeout + `&` background) to avoid blocking.

### 5. Flash firmware (optional)

```bash
source ~/esp/esp-idf/export.sh
make fw-stopwatch    # StopWatch
```

## Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start server (:8000) + WebUI (:5173) |
| `make server` | Start server only |
| `make webui` | Start WebUI only |
| `make test` | Run all tests |
| `make lint` | Run Python ruff linter |
| `make fw-stopwatch` | Build, flash, and monitor StopWatch firmware |

## Configuration

| Item | Location |
|------|----------|
| API Keys | macOS Keychain via `keyring` (service = `openbuddy`) |
| App Config | `~/.config/openbuddy/config.json` |
| Custom Prompts | `~/.config/openbuddy/prompts.json` |
| Logs | `~/.cache/openbuddy/` |

## Project Structure

```
openbuddy/
├── openbuddy_server/    # Python FastAPI backend
│   ├── voice/           #   Voice pipeline (STT, TTS, Qwen)
│   ├── agent/           #   Agent lifecycle & scrubbing
│   ├── ws/              #   WebSocket endpoints
│   └── api/             #   REST API routes
├── openbuddy_webui/     # React WebUI (Vite + TypeScript + Tailwind)
├── stopwatch/           # StopWatch ESP32-S3 firmware
└── openbuddy_fun/       # Landing page (openbuddy.fun)
```

## Contributing

```bash
make lint    # Python: ruff check + format
make test    # pytest + vitest
```

- Python: ruff (line-length=100)
- TypeScript: ESLint with `@/` path alias
- Firmware: ESP-IDF CMake, C++ namespaced by app

## License

[MIT](LICENSE)

## Links

- 🌐 Website: [openbuddy.fun](https://openbuddy.fun)
- 📦 GitHub: [lennonkc/openbuddy](https://github.com/lennonkc/openbuddy)
