<p align="center">
  <a href="../README.md">English</a> ·
  <a href="README.zh.md">中文</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="assets/openbuddy-logo.svg" alt="OpenBuddy Logo" width="120">
</p>

<h1 align="center">OpenBuddy</h1>

<p align="center">
  <em>楽しくて使いやすい AI — 最も強力なツールを最も好奇心旺盛な人々へ</em>
</p>

<p align="center">
  <a href="https://openbuddy.fun"><img src="https://img.shields.io/badge/🌐_Website-openbuddy.fun-4CD5C3?style=flat-square" alt="Website"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.11+">
  <img src="https://img.shields.io/badge/ESP--IDF-5.4%2F5.5-E7352C?style=flat-square&logo=espressif&logoColor=white" alt="ESP-IDF">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/Platform-macOS-999?style=flat-square&logo=apple&logoColor=white" alt="macOS">
</p>

<p align="center">
  <a href="https://youtu.be/PxPKkh4E9-Y">
    <img src="https://img.youtube.com/vi/PxPKkh4E9-Y/maxresdefault.jpg" alt="OpenBuddy デモ動画" width="640">
  </a>
  <br>
  <em>▶ <a href="https://youtu.be/PxPKkh4E9-Y">YouTube でデモを見る</a></em>
</p>

---

## OpenBuddy とは？

OpenBuddy は **M5Stack ESP32-S3** デバイス上に構築された Claude Code デスクペットシステムです。可愛いアニメーションキャラクターを通じて、AI 音声インタラクションをデスクトップにお届けします — すべて Claude Code が裏側で動いています。

2つのハードウェアに対応しています：**Cardputer**（矩形 LCD）と **StopWatch**（円形 AMOLED）。ESP32 ファームウェア ↔ Python バックエンド ↔ React WebUI の三層アーキテクチャが WebSocket でリアルタイムに接続されています。

## 特徴

- 🗣️ **音声ファーストインタラクション** — ボタンを押して話すだけ。STT → Agent → TTS の完全なパイプライン
- 🐾 **デスクペットアニメーション** — 6つのアニメーション状態：待機・聞き取り・思考・発話・エラー・切断
- 🔌 **Claude Code 統合** — Claude Code のライフサイクルイベント（Stop、PreToolUse、PostToolUse、Notification）にリアルタイムで連携
- 🌐 **Web ダッシュボード** — 設定管理、リアルタイムチャット表示、ファイルエクスプローラー、プロンプト管理
- 📡 **自動検出** — `openbuddy.local` による mDNS サービスディスカバリー、IP 手動設定不要
- 🎯 **デュアルデバイス対応** — 1つのサーバーで Cardputer と StopWatch を同時にサポート
- 🔊 **バイリンガル音声** — テキスト内容に基づいて中国語と英語の音声を自動選択

## アーキテクチャ

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

**音声パイプライン（F3 チェーン）：**

```
🎤 マイク → STT (ElevenLabs Scribe v2) → Qwen テキスト整形 → Agent → Qwen テキスト整形 → TTS (ElevenLabs v3) → 🔊 スピーカー
```

## 対応デバイス

| 仕様 | Cardputer | StopWatch |
|------|-----------|-----------|
| ディスプレイ | 1.14" ST7789 LCD 320×240 | 円形 AMOLED |
| Flash | 8 MB | 16 MB |
| PSRAM | — | 外付け OCT 80 MHz |
| UI フレームワーク | smooth_ui_toolkit | LVGL v9 |
| オーディオコーデック | ES8311 (I²S) | ES8311 (I²S) |
| ESP-IDF | 5.4.2 | 5.5.4 |

## クイックスタート

### 1. リポジトリをクローン

```bash
git clone https://github.com/lennonkc/openbuddy.git
cd openbuddy
```

### 2. サーバーと WebUI を起動

```bash
make dev
# サーバー :8000 · WebUI :5173
```

### 3. API キーの設定

http://localhost:5173 → **Settings** パネルを開くか、CLI を使用します：

```bash
keyring set openbuddy elevenlabs <key>   # STT + TTS
keyring set openbuddy dashscope <key>    # Qwen テキスト整形
keyring set openbuddy llm <key>          # Agent LLM
```

### 4. Claude Code hooks の設定

`~/.claude/settings.json` に以下を追加します：

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

`UserPromptSubmit`、`PreToolUse`、`PostToolUse`、`Notification`、`SessionStart` にも同じパターンを適用してください。`Stop` hook はブロッキングを避けるため、必ず fire-and-forget（短いタイムアウト + `&` バックグラウンド実行）で設定してください。

### 5. ファームウェアの書き込み（任意）

```bash
source ~/esp/esp-idf/export.sh
make fw-stopwatch    # StopWatch
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `make dev` | サーバー (:8000) + WebUI (:5173) を起動 |
| `make server` | サーバーのみ起動 |
| `make webui` | WebUI のみ起動 |
| `make test` | 全テスト実行 |
| `make lint` | Python ruff リンター実行 |
| `make fw-stopwatch` | StopWatch ファームウェアのビルド・書き込み・モニター |

## 設定

| 項目 | 場所 |
|------|------|
| API キー | macOS キーチェーン、`keyring` 経由（service = `openbuddy`） |
| アプリ設定 | `~/.config/openbuddy/config.json` |
| カスタムプロンプト | `~/.config/openbuddy/prompts.json` |
| ログ | `~/.cache/openbuddy/` |

## プロジェクト構成

```
openbuddy/
├── openbuddy_server/    # Python FastAPI バックエンド
│   ├── voice/           #   音声パイプライン（STT、TTS、Qwen）
│   ├── agent/           #   Agent ライフサイクルとスクラビング
│   ├── ws/              #   WebSocket エンドポイント
│   └── api/             #   REST API ルート
├── openbuddy_webui/     # React WebUI (Vite + TypeScript + Tailwind)
├── stopwatch/           # StopWatch ESP32-S3 ファームウェア
└── openbuddy_fun/       # ランディングページ (openbuddy.fun)
```

## コントリビューション

```bash
make lint    # Python: ruff check + format
make test    # pytest + vitest
```

- Python: ruff (line-length=100)
- TypeScript: ESLint、パスエイリアス `@/`
- ファームウェア: ESP-IDF CMake、C++ アプリごとの名前空間

## ライセンス

[MIT](../LICENSE)

## リンク

- 🌐 ウェブサイト：[openbuddy.fun](https://openbuddy.fun)
- 📦 GitHub：[lennonkc/openbuddy](https://github.com/lennonkc/openbuddy)
