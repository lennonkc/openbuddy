# openbuddy_webui

OpenBuddy 的开发面板：配置 API key、设置 Claude 工作目录、观察实时事件流。仅本机用，不做鉴权。

## 启动

```bash
npm install   # 首次
npm run dev   # vite :5173
```

需要 server 同时在 `:8000` 跑（顶层 `make dev` 会一起起）。

## 面板

- **KeysPanel** — 配 `elevenlabs` / `dashscope` key，调 `POST /keys/:name`，写到 macOS keyring
- **CwdPanel** — 设 Claude Code agent 的 `cwd`，决定 LLM 在哪个仓库里跑
- **StatusPanel** — 显示当前状态机帧：`idle` / `thinking` / `error`
- **EventStream** — 透传 `/ws/openbuddy` 上所有事件（`transcript` / `assistant_text` / `spoken_text` / `tts_start` / `tts_pcm` / `tts_end` / `error`），JSON 原文展示，便于调试 voice pipeline

## 栈

React 19 · Vite · Tailwind · shadcn/ui · TypeScript。所有事件订阅集中在 `src/lib/useEventStream.ts`。
