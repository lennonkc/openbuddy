# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

OpenBuddy — 基于 M5Stack ESP32-S3 设备的 Claude Code 桌宠系统。支持两款硬件：**Cardputer**（矩形 LCD）和 **StopWatch**（圆形 AMOLED）。三层架构：ESP32 固件 ↔ Python 服务端 ↔ React WebUI，通过 WebSocket 实时通信。桌宠是纯状态指示器，不入 Claude system prompt。

## 构建与运行

```bash
# ESP-IDF 环境加载（每个 shell 会话需执行一次）
source ~/esp/esp-idf/export.sh

# 服务端 + WebUI 同时启动（server :8000 / webui :5173）
make dev

# 仅服务端 / 仅 WebUI
make server
make webui

# 固件编译 + 烧录 + 串口监视
make fw-cardputer    # Cardputer 设备
make fw-stopwatch    # StopWatch 设备
```

## 测试与 Lint

```bash
# 全部测试
make test

# 服务端单个测试
cd openbuddy_server && .venv/bin/pytest tests/test_ws_cardputer.py -xvs

# 服务端 lint
make lint
# 等价于: cd openbuddy_server && .venv/bin/ruff check . && .venv/bin/ruff format --check .

# WebUI lint
cd openbuddy_webui && npm run lint
```

## 架构

### `openbuddy_server/` — Python 服务端 (FastAPI + uvicorn)

包管理: uv，Python ≥3.11，虚拟环境在 `openbuddy_server/.venv/`。

**核心模块:**

- `server.py` — FastAPI 入口，lifespan 管理 mDNS 注册/注销
- `events.py` — EventBus 发布/订阅总线，所有模块间通信的中枢
- `config.py` — Settings (pydantic-settings)，配置目录 `~/.config/openbuddy/`
- `keychain.py` — API key 的 keyring 存储：`elevenlabs` (STT + TTS)、`dashscope` (Qwen 文本清洗)、`llm` (Agent LLM)
- `mdns.py` — zeroconf mDNS 注册，设备通过 `openbuddy.local` 发现服务器

**WebSocket 层 (`ws/`):**

- `cardputer.py` — `/ws/openbuddy` 端点，设备连接入口，单连接限制（新连接驱逐旧连接），15s 心跳，PCM pacing 节流推送
- `webui.py` — `/ws/webui` 端点，WebUI 事件流，连接时立即推送 `last_device_state`
- `protocol.py` — 帧协议定义，Pydantic discriminated union，hello 帧含 `device_name` 字段

**语音流水线 (`voice/`):**

F3 链路: mic → `stt.py` (ElevenLabs Scribe v2) → `qwen.py` (Qwen 口语→书面) → Agent → `scrub.py` (情绪标签提取) → `qwen.py` (书面→口语) → `tts.py` (ElevenLabs v3 PCM16/16k) → 喇叭

- `pipeline.py` — 编排整条链路，事件发布驱动 WebUI + 设备状态同步
- `stt.py` — ElevenLabs Scribe v2，PCM→WAV 封装后上传
- `tts.py` — ElevenLabs Eleven v3，流式接收 PCM16 16kHz mono 音频，自动根据文本语言选择中/英语音
- `qwen.py` — DashScope Qwen3.6-flash 双向文本清洗（用户口语→书面、助手书面→口语）
- `buffer.py` — AudioBuffer，PCM 累积器（最大 30s）

**Agent (`agent/`):**

- `lifecycle.py` — AgentManager，持有 `claude-agent-sdk` 客户端，session_id 固定为 `"openbuddy"`
- `env.py` — 注入 LLM 端点环境变量（默认 MiniMax M2.7 Anthropic 兼容端点，可通过 WebUI 配置切换）
- `scrub.py` — 从 Agent 回复中提取 `<<emotion>>` 标签并清理方括号标注

**REST API (`api/`):** config、devices、keys、prompts、fs 管理端点

**Hooks (`hooks/`):** 接收 Claude Code hook 回调 (`/hooks/{name}`)，仅允许 localhost，过滤 `session_id != "openbuddy"` 的事件

### `openbuddy_webui/` — React WebUI (Vite + TypeScript + Tailwind)

React 19 + react-router-dom + shadcn/ui + @assistant-ui/react + GSAP 动画。

- 路由: `/chat` (默认)、`/buddy`、`/room`、`/sticker-book`、`/settings`
- `useEventStream.ts` — 单一 WebSocket `/ws/webui` 连接共享，指数退避重连，事件流驱动所有页面状态
- WebUI 通过 `useChatMessages` / `useAgentState` / `useDeviceConnected` 派生视图状态
- 构建产物 `dist/` 被服务端 StaticFiles 挂载到 `/`

### `openbuddy_fun/` — 外部展示页 (Git 子模块，纯静态站)

OpenBuddy 项目的公开着陆页，域名 `openbuddy.fun`。无构建步骤，纯 HTML + CSS + JS。

```bash
# 本地开发（live reload）
cd openbuddy_fun && npx serve .

# 或直接浏览器打开 index.html
```

部署: 静态文件直接推送到 Vercel / Netlify / GitHub Pages。

**技术栈:**
- GSAP 3.12 + ScrollTrigger（CDN 引入），实现水平滚动 + 逐面板动画
- 字体: Fredoka (display) + Nunito (body)，Google Fonts 加载
- 7 个全屏面板: Hero → Problem → Solution → Showcase → Screenshots → Video → CTA
- 配色变量定义在 `css/style.css` `:root` 中（`--primary` 青绿 / `--secondary` 黄 / `--pink` / `--purple`）

**核心机制:**
- `js/main.js` 中 `initHorizontalScroll()` 使用 ScrollTrigger pin + scrub 将垂直滚动映射为水平位移
- 各面板动画通过 `animateIn()` helper 绑定 `containerAnimation: scrollTween`，确保在水平滚动坐标系内触发
- 自定义文字拆分工具 `splitIntoWords()` 实现逐词/逐字符入场动画（未使用 SplitText 插件）
- 视频面板的 YouTube 嵌入 ID 在 `js/main.js` 中 `VIDEO_ID` 常量配置

**注意:**
- 这是独立 Git 仓库（`github.com/lennonkc/openbuddy_fun`），作为子模块挂载
- 移动端响应式通过 `@media (max-width: 900px)` 断点处理，水平滚动在所有设备保持

### `cardputer_adv/` — Cardputer 固件 (ESP-IDF 5.4.2 / C++)

基于 Mooncake 框架的多 app 架构。矩形 LCD (ST7789 320×240)，8MB Flash，ES8311 音频 codec。

OpenBuddy app 在 `main/apps/app_openbuddy/`，核心文件：

- `app_openbuddy.cpp` — 应用生命周期 (onCreate/onOpen/onRunning/onClose)，主循环轮询重连 + 双看门狗
- `ws_session.cpp/.h` — WebSocket 客户端，mDNS 解析 `openbuddy.local`，IP 缓存到 NVS，轮询式退避重连
- `audio_pipe.cpp/.h` — 半双工音频管道，mic 上行 (PCM16-LE 20ms 帧) 与 TTS 下行 (ringbuf 降级) 互斥
- `pet_render.cpp/.h` — 桌宠状态渲染，6 种状态: idle/listening/thinking/speaking/error/disconnected

### `stopwatch/` — StopWatch 固件 (ESP-IDF 5.5.4 / C++)

基于 M5StopWatch-UserDemo 官方固件，使用 Mooncake + LVGL 框架。圆形 AMOLED 屏幕，16MB Flash，外置 PSRAM (OCT 80MHz)。

OpenBuddy app 同样在 `main/apps/app_openbuddy/`，与 Cardputer 共享相同的核心文件结构，另增：

- `wifi_manager.cpp/.h` — WiFi 扫描、连接、状态管理（独立于 HAL 层）

Settings app (`main/apps/app_setup/`) 包含 WiFi 连接设置界面 (`workers/wifi.cpp`)。

**两款固件的 OpenBuddy app 使用相同的 WebSocket 协议和服务端对接，共享同一个 `openbuddy_server` 后端。**

## 帧协议

设备→服务器 (JSON): `hello`（含 `device_name`）/ `mic_start` / `mic_stop` / `reset`
设备→服务器 (binary): PCM16-LE 16kHz mono 音频帧
服务器→设备 (JSON): `state` / `sfx` / `transcript` / `assistant_text` / `tts_start` / `tts_end` / `ready` / `error` / `heartbeat`
服务器→设备 (binary): TTS PCM16 音频流（4KB 分片 pacing）

## 数据流向

```
Cardputer/StopWatch ──WS /ws/openbuddy──▶ Server ──EventBus──▶ WS /ws/webui──▶ WebUI
        │                                    │
        │ mic PCM ──────────────────▶ AudioBuffer
        │                                    │ drain → pipeline
        │                                    │   STT (ElevenLabs)
        │                                    │   Qwen cleanup ①
        │                                    │   Agent (MiniMax M2.7 via claude-agent-sdk)
        │                                    │   scrub (emotion extraction)
        │                                    │   Qwen cleanup ②
        │                                    │   TTS (ElevenLabs v3 PCM16)
        │ ◀── tts_pcm (paced) ──────────────┘
        │ ◀── state/sfx frames ─────────────┘
```

## 配置文件位置

- API keys: macOS Keychain (`keyring` 库，service = `openbuddy`)
- 应用配置: `~/.config/openbuddy/config.json` → cwd、buddy_skin
- 自定义 prompts: `~/.config/openbuddy/prompts.json` → stage1 (用户清洗)、stage2 (助手清洗)
- 日志: `~/.cache/openbuddy/`

## 代码规范

- Python: ruff (line-length=100, select E/F/I/W/B/UP)
- 测试: pytest + pytest-asyncio (asyncio_mode="auto")，conftest 自动 mock keyring 和 mDNS
- TypeScript: ESLint，path alias `@/` → `src/`
- 固件: ESP-IDF CMake 构建系统，C++ namespace 按 app 隔离

## 重要约束

- Agent LLM 默认走 MiniMax M2.7 Anthropic 兼容端点，可通过 WebUI Settings 配置切换任意兼容 API
- TTS 使用 ElevenLabs 流式 API，`output_format=pcm_16000` 直接输出 PCM16 16kHz mono，设备可直接播放
- 设备 WebSocket 重连使用主循环 `pollReconnect()` 轮询模式，**不**使用 esp_timer 回调（避免 UAF/死锁）
- `ws_session.stop()` 禁止从 WS event callback 内调用（ESP-IDF 递归信号量死锁）
- Hooks 路由只接受 localhost 请求，且只处理 `session_id == "openbuddy"` 的事件
- StopWatch 固件中事件处理函数（WiFi 回调等）运行在 `sys_evt` 任务中，栈空间受限，**不**使用 mclog 日志库，改用 ESP_LOGW/ESP_LOGI
- 会话不跨重启持久化

## 硬件差异速查

| 特性 | Cardputer | StopWatch |
|------|-----------|-----------|
| 屏幕 | 1.14" ST7789 LCD 320×240 | 圆形 AMOLED |
| Flash | 8MB | 16MB |
| PSRAM | 无 | 外置 OCT 80MHz |
| UI 框架 | smooth_ui_toolkit | LVGL v9 |
| 音频 Codec | ES8311 (I²S) | ES8311 (I²S) |
| ESP-IDF | 5.4.2 | 5.5.4 |
| 蓝牙 | BLE HID 键盘 | 无 |
| 输入 | TCA8418 矩阵键盘 + Home 键 | 按钮 |
