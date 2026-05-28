<p align="center">
  <a href="../README.md">English</a> ·
  <a href="README.zh.md">中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.fr.md">Français</a>
</p>

<p align="center">
  <img src="assets/openbuddy-logo.svg" alt="OpenBuddy Logo" width="120">
</p>

<h1 align="center">OpenBuddy</h1>

<p align="center">
  <em>Una IA divertida y fácil — llevando las herramientas más poderosas a las mentes más curiosas</em>
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
    <img src="https://img.youtube.com/vi/PxPKkh4E9-Y/maxresdefault.jpg" alt="Vídeo demo de OpenBuddy" width="640">
  </a>
  <br>
  <em>▶ <a href="https://youtu.be/PxPKkh4E9-Y">Ver la demo en YouTube</a></em>
</p>

---

## ¿Qué es OpenBuddy?

OpenBuddy es un sistema de mascota de escritorio para Claude Code construido sobre dispositivos **M5Stack ESP32-S3**. Lleva la interacción por voz con IA a su escritorio a través de un simpático compañero animado que escucha, piensa y habla — todo impulsado por Claude Code.

Se admiten dos variantes de hardware: **Cardputer** (LCD rectangular) y **StopWatch** (AMOLED circular). Una arquitectura de tres capas — firmware ESP32 ↔ backend Python ↔ WebUI React — conecta todo en tiempo real mediante WebSocket.

## Características

- 🗣️ **Interacción por voz** — pulse un botón, hable naturalmente, obtenga una respuesta hablada. Pipeline completo STT → Agent → TTS
- 🐾 **Animación de mascota** — 6 estados animados: inactivo, escuchando, pensando, hablando, error, desconectado
- 🔌 **Integración con Claude Code** — se conecta en tiempo real a los eventos del ciclo de vida de Claude Code (Stop, PreToolUse, PostToolUse, Notification)
- 🌐 **Panel web** — configure ajustes, vea transcripciones en vivo, explore archivos, gestione prompts
- 📡 **Descubrimiento automático** — descubrimiento de servicios mDNS mediante `openbuddy.local`, sin configuración manual de IP
- 🎯 **Soporte para dos dispositivos** — un solo servidor alimenta Cardputer y StopWatch simultáneamente
- 🔊 **Voz bilingüe** — selecciona automáticamente la voz en chino o inglés según el contenido del texto

## Arquitectura

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

**Pipeline de voz (cadena F3):**

```
🎤 Micrófono → STT (ElevenLabs Scribe v2) → Limpieza Qwen → Agent → Limpieza Qwen → TTS (ElevenLabs v3) → 🔊 Altavoz
```

## Dispositivos compatibles

| Característica | Cardputer | StopWatch |
|----------------|-----------|-----------|
| Pantalla | 1.14" ST7789 LCD 320×240 | AMOLED circular |
| Flash | 8 MB | 16 MB |
| PSRAM | — | Externa OCT 80 MHz |
| Framework UI | smooth_ui_toolkit | LVGL v9 |
| Códec de audio | ES8311 (I²S) | ES8311 (I²S) |
| ESP-IDF | 5.4.2 | 5.5.4 |

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/lennonkc/openbuddy.git
cd openbuddy
```

### 2. Iniciar el servidor y la WebUI

```bash
make dev
# Servidor en :8000 · WebUI en :5173
```

### 3. Configurar las claves API

Abra http://localhost:5173 → panel **Settings**, o use la línea de comandos:

```bash
keyring set openbuddy elevenlabs <key>   # STT + TTS
keyring set openbuddy dashscope <key>    # Limpieza de texto Qwen
keyring set openbuddy llm <key>          # Agent LLM
```

### 4. Configurar los hooks de Claude Code

Añada lo siguiente a `~/.claude/settings.json`:

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

Aplique el mismo patrón para `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Notification` y `SessionStart`. El hook `Stop` debe ser fire-and-forget (timeout corto + `&` en segundo plano) para evitar bloqueos.

### 5. Flashear el firmware (opcional)

```bash
source ~/esp/esp-idf/export.sh
make fw-stopwatch    # StopWatch
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `make dev` | Iniciar servidor (:8000) + WebUI (:5173) |
| `make server` | Iniciar solo el servidor |
| `make webui` | Iniciar solo la WebUI |
| `make test` | Ejecutar todas las pruebas |
| `make lint` | Ejecutar el linter Python ruff |
| `make fw-stopwatch` | Compilar, flashear y monitorear firmware StopWatch |

## Configuración

| Elemento | Ubicación |
|----------|-----------|
| Claves API | Llavero de macOS mediante `keyring` (service = `openbuddy`) |
| Configuración de la app | `~/.config/openbuddy/config.json` |
| Prompts personalizados | `~/.config/openbuddy/prompts.json` |
| Registros | `~/.cache/openbuddy/` |

## Estructura del proyecto

```
openbuddy/
├── openbuddy_server/    # Backend Python FastAPI
│   ├── voice/           #   Pipeline de voz (STT, TTS, Qwen)
│   ├── agent/           #   Ciclo de vida del Agent y limpieza
│   ├── ws/              #   Endpoints WebSocket
│   └── api/             #   Rutas de la API REST
├── openbuddy_webui/     # React WebUI (Vite + TypeScript + Tailwind)
├── stopwatch/           # Firmware StopWatch ESP32-S3
└── openbuddy_fun/       # Página de presentación (openbuddy.fun)
```

## Contribuir

```bash
make lint    # Python: ruff check + format
make test    # pytest + vitest
```

- Python: ruff (line-length=100)
- TypeScript: ESLint con alias de ruta `@/`
- Firmware: ESP-IDF CMake, namespaces C++ por aplicación

## Licencia

[MIT](../LICENSE)

## Enlaces

- 🌐 Sitio web: [openbuddy.fun](https://openbuddy.fun)
- 📦 GitHub: [lennonkc/openbuddy](https://github.com/lennonkc/openbuddy)
