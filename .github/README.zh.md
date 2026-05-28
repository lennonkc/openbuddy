<p align="center">
  <a href="../README.md">English</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="assets/openbuddy-logo.svg" alt="OpenBuddy Logo" width="120">
</p>

<h1 align="center">OpenBuddy</h1>

<p align="center">
  <em>有趣又好用的 AI — 把最强大的工具带给最好奇的人</em>
</p>

<p align="center">
  <a href="https://openbuddy.fun"><img src="https://img.shields.io/badge/🌐_Website-openbuddy.fun-4CD5C3?style=flat-square" alt="Website"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.11+">
  <img src="https://img.shields.io/badge/ESP--IDF-5.4%2F5.5-E7352C?style=flat-square&logo=espressif&logoColor=white" alt="ESP-IDF">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/Platform-macOS-999?style=flat-square&logo=apple&logoColor=white" alt="macOS">
</p>

---

## OpenBuddy 是什么？

OpenBuddy 是一套基于 **M5Stack ESP32-S3** 设备的 Claude Code 桌宠系统。它将 AI 语音交互带到你的桌面，通过一个可爱的动画伙伴来倾听、思考和回应 — 一切由 Claude Code 驱动。

支持两款硬件：**Cardputer**（矩形 LCD）和 **StopWatch**（圆形 AMOLED）。三层架构 — ESP32 固件 ↔ Python 服务端 ↔ React WebUI — 通过 WebSocket 实时连接。

## 特性

- 🗣️ **语音优先交互** — 按下按钮，自然说话，获得语音回复。完整的 STT → Agent → TTS 流水线
- 🐾 **桌宠动画** — 6 种动画状态：空闲、聆听、思考、说话、错误、断开连接
- 🔌 **Claude Code 集成** — 实时接入 Claude Code 生命周期事件（Stop、PreToolUse、PostToolUse、Notification）
- 🌐 **Web 管理面板** — 配置设置、查看实时对话记录、浏览文件、管理提示词
- 📡 **自动发现** — 通过 `openbuddy.local` 实现 mDNS 服务发现，无需手动配置 IP
- 🎯 **双设备支持** — 一个服务端同时驱动 Cardputer 和 StopWatch
- 🔊 **中英双语语音** — 根据文本内容自动选择中文或英文语音

## 架构

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

**语音流水线（F3 链路）：**

```
🎤 麦克风 → STT (ElevenLabs Scribe v2) → Qwen 文本清洗 → Agent → Qwen 文本清洗 → TTS (ElevenLabs v3) → 🔊 扬声器
```

## 支持的设备

| 特性 | Cardputer | StopWatch |
|------|-----------|-----------|
| 屏幕 | 1.14" ST7789 LCD 320×240 | 圆形 AMOLED |
| Flash | 8 MB | 16 MB |
| PSRAM | — | 外置 OCT 80 MHz |
| UI 框架 | smooth_ui_toolkit | LVGL v9 |
| 音频编解码器 | ES8311 (I²S) | ES8311 (I²S) |
| ESP-IDF | 5.4.2 | 5.5.4 |

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/lennonkc/openbuddy.git
cd openbuddy
```

### 2. 启动服务端和 WebUI

```bash
make dev
# 服务端 :8000 · WebUI :5173
```

### 3. 配置 API 密钥

打开 http://localhost:5173 → **Settings** 面板，或使用命令行：

```bash
keyring set openbuddy elevenlabs <key>   # STT + TTS
keyring set openbuddy dashscope <key>    # Qwen 文本清洗
keyring set openbuddy llm <key>          # Agent LLM
```

### 4. 设置 Claude Code hooks

在 `~/.claude/settings.json` 中添加：

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

对 `UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Notification` 和 `SessionStart` 使用相同格式。`Stop` hook 必须使用 fire-and-forget 模式（短超时 + `&` 后台执行），否则会阻塞每轮 Stop。

### 5. 烧录固件（可选）

```bash
source ~/esp/esp-idf/export.sh
make fw-stopwatch    # StopWatch
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `make dev` | 启动服务端 (:8000) + WebUI (:5173) |
| `make server` | 仅启动服务端 |
| `make webui` | 仅启动 WebUI |
| `make test` | 运行全部测试 |
| `make lint` | 运行 Python ruff 检查 |
| `make fw-stopwatch` | 编译、烧录并监视 StopWatch 固件 |

## 配置

| 项目 | 位置 |
|------|------|
| API 密钥 | macOS 钥匙串，通过 `keyring`（service = `openbuddy`） |
| 应用配置 | `~/.config/openbuddy/config.json` |
| 自定义提示词 | `~/.config/openbuddy/prompts.json` |
| 日志 | `~/.cache/openbuddy/` |

## 项目结构

```
openbuddy/
├── openbuddy_server/    # Python FastAPI 服务端
│   ├── voice/           #   语音流水线（STT、TTS、Qwen）
│   ├── agent/           #   Agent 生命周期与清洗
│   ├── ws/              #   WebSocket 端点
│   └── api/             #   REST API 路由
├── openbuddy_webui/     # React WebUI (Vite + TypeScript + Tailwind)
├── stopwatch/           # StopWatch ESP32-S3 固件
└── openbuddy_fun/       # 着陆页 (openbuddy.fun)
```

## 贡献

```bash
make lint    # Python: ruff check + format
make test    # pytest + vitest
```

- Python: ruff (line-length=100)
- TypeScript: ESLint，路径别名 `@/`
- 固件: ESP-IDF CMake，C++ 按 app 隔离命名空间

## 许可证

[MIT](../LICENSE)

## 链接

- 🌐 官网：[openbuddy.fun](https://openbuddy.fun)
- 📦 GitHub：[lennonkc/openbuddy](https://github.com/lennonkc/openbuddy)
