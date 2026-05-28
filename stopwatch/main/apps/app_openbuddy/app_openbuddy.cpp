/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#include "app_openbuddy.h"
#include "ws_session.h"
#include "pet_render.h"
#include "audio_pipe.h"
#include "wifi_manager.h"
#include <hal/hal.h>
#include <mooncake_log.h>
#include <assets/assets.h>

namespace app_openbuddy {

static constexpr const char* TAG = "openbuddy";
static WsSession g_ws;
static AudioPipe g_audio;

AppOpenBuddy::AppOpenBuddy()
{
    setAppInfo().name = "OpenBuddy";
    setAppInfo().icon = (void*)&icon_openbuddy;
}

void AppOpenBuddy::onCreate()
{
    mclog::tagInfo(TAG, "on create");
}

void AppOpenBuddy::onOpen()
{
    mclog::tagInfo(TAG, "on open");

    _key_manager = std::make_unique<input::KeyManager>();
    _ptt_active = false;

    GetHAL().setAudioSampleRate(16000);

    {
        LvglLockGuard lock;
        petRenderInit();
    }

    if (!wifi_manager::isConnected()) {
        renderPet(PetState::disconnected);
        mclog::tagWarn(TAG, "WiFi not connected");
    }

    g_ws.start();

    g_audio.onFrame([](const uint8_t* buf, size_t n) {
        if (g_ws.isReady())
            g_ws.sendBinary(buf, n);
    });

    g_ws.onBinary([](const uint8_t* b, size_t n) {
        g_audio.enqueueTtsPcm(b, n);
    });

    g_ws.onJson([this](const std::string& s) {
        if (s.find("\"type\":\"state\"") != std::string::npos) {
            if (s.find("\"state\":\"idle\"") != std::string::npos) {
                _auth_pending = false;
                renderPet(PetState::idle);
            } else if (s.find("\"state\":\"listening\"") != std::string::npos) {
                renderPet(PetState::listening);
            } else if (s.find("\"state\":\"thinking\"") != std::string::npos) {
                renderPet(PetState::thinking);
            } else if (s.find("\"state\":\"speaking\"") != std::string::npos) {
                renderPet(PetState::speaking);
            } else if (s.find("\"state\":\"error\"") != std::string::npos) {
                _auth_pending = false;
                renderPet(PetState::error);
            } else if (s.find("\"state\":\"disconnected\"") != std::string::npos) {
                _auth_pending = false;
                renderPet(PetState::disconnected);
            }
        }

        if (s.find("\"type\":\"authorization_request\"") != std::string::npos) {
            // 提取 request_id — 格式: "request_id":"xxxxxxxx"
            auto pos = s.find("\"request_id\":\"");
            if (pos != std::string::npos) {
                pos += 14;  // strlen("\"request_id\":\"")
                auto end = s.find('"', pos);
                if (end != std::string::npos) {
                    _auth_request_id = s.substr(pos, end - pos);
                    _auth_pending = true;
                    renderPet(PetState::authorizing);
                }
            }
        }

        if (s.find("\"type\":\"tts_end\"") != std::string::npos) {
            g_audio.onTtsEnd();
        }
    });

    g_ws.onDisconnect([]() { renderPet(PetState::disconnected); });

    renderPet(PetState::disconnected);
}

void AppOpenBuddy::onRunning()
{
    if (_key_manager && _key_manager->update() == input::KeyEvent::GoHome) {
        close();
        return;
    }

    g_ws.pollReconnect();

    bool ready = g_ws.isReady();
    uint32_t silence = g_ws.msSinceLastRx();

    if ((ready && silence > 30000) || (!ready && silence > 60000)) {
        g_ws.stop();
        renderPet(PetState::disconnected);
        g_ws.start();
        return;
    }

    // btnA = authorize pending tool request
    if (GetHAL().btnA.wasClicked() && _auth_pending) {
        _auth_pending = false;
        std::string resp = "{\"type\":\"authorization_response\",\"request_id\":\""
                           + _auth_request_id + "\",\"approved\":true}";
        g_ws.sendJson(resp);
        renderPet(PetState::thinking);
    }

    // btnB = push-to-talk (button states already updated by _key_manager->update())
    if (GetHAL().btnB.wasPressed() && !_ptt_active) {
        if (g_ws.isReady()) {
            _ptt_active = true;
            g_ws.sendJson("{\"type\":\"mic_start\"}");
            g_audio.startRecording();
        }
    }

    if (GetHAL().btnB.wasReleased() && _ptt_active) {
        _ptt_active = false;
        g_audio.stopRecording();
        g_ws.sendJson("{\"type\":\"mic_stop\"}");
    }
}

void AppOpenBuddy::onClose()
{
    mclog::tagInfo(TAG, "on close");

    _ptt_active = false;
    g_audio.stopRecording();
    g_ws.stop();

    {
        LvglLockGuard lock;
        petRenderDeinit();
    }

    _key_manager.reset();

    GetHAL().setAudioSampleRate(44100);
}

}  // namespace app_openbuddy
