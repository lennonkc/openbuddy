/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#include "ws_session.h"
#include <esp_websocket_client.h>
#include <esp_event.h>
#include <esp_timer.h>
#include <hal/hal.h>
#include <mdns.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <mooncake_log.h>
#include <cstdio>
#include <cstring>
#include <nvs_flash.h>
#include <nvs.h>

#ifndef OPENBUDDY_FALLBACK_IP
#define OPENBUDDY_FALLBACK_IP "192.168.10.196"
#endif

namespace app_openbuddy {

static constexpr const char* TAG            = "openbuddy_ws";
static constexpr const char* kFwVersion     = "0.1.0-stopwatch";
static constexpr uint16_t    kServerPort    = 8000;
static constexpr const char* kWsPath        = "/ws/openbuddy";
static constexpr const char* kMdnsHostname  = "openbuddy";
static constexpr int         kMdnsTimeoutMs = 2000;

static constexpr uint32_t kBackoffMs[]  = {1000, 2000, 4000, 8000};
static constexpr int      kBackoffMax   = (int)(sizeof(kBackoffMs) / sizeof(kBackoffMs[0])) - 1;

WsSession::WsSession() = default;
WsSession::~WsSession() { stop(); }

void WsSession::start()
{
    _stopping.store(false);
    _backoff_index.store(0);
    _ready.store(false);
    _reconnect_after_ms.store(0);
    _last_rx_ms.store((uint32_t)(esp_timer_get_time() / 1000));

    auto mac = GetHAL().getFactoryMac();
    char mac_str[13];
    std::snprintf(mac_str, sizeof(mac_str), "%02x%02x%02x%02x%02x%02x",
                  mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    _device_id = mac_str;

    esp_err_t mdns_err = mdns_init();
    _mdns_ok = (mdns_err == ESP_OK || mdns_err == ESP_ERR_INVALID_STATE);
    if (!_mdns_ok) {
        mclog::tagWarn(TAG, "mdns_init failed ({}), mDNS disabled", (int)mdns_err);
    }

    rebuild_ws_url();
    connect();
}

void WsSession::stop()
{
    _stopping.store(true);
    _ready.store(false);
    _reconnect_after_ms.store(0);

    if (_mdns_ok) {
        mdns_free();
        _mdns_ok = false;
    }

    if (!_client) return;
    auto handle = static_cast<esp_websocket_client_handle_t>(_client);
    esp_websocket_client_close(handle, pdMS_TO_TICKS(1000));
    esp_websocket_client_destroy(handle);
    _client = nullptr;
}

bool WsSession::isReady() const { return _ready.load(); }

uint32_t WsSession::msSinceLastRx() const
{
    return (uint32_t)(esp_timer_get_time() / 1000) - _last_rx_ms.load();
}

bool WsSession::pollReconnect()
{
    uint32_t target = _reconnect_after_ms.load();
    if (target == 0) return false;
    uint32_t now = (uint32_t)(esp_timer_get_time() / 1000);
    if (now < target) return false;

    _reconnect_after_ms.store(0);

    if (_client) {
        auto old = static_cast<esp_websocket_client_handle_t>(_client);
        _client = nullptr;
        esp_websocket_client_close(old, pdMS_TO_TICKS(1000));
        esp_websocket_client_destroy(old);
    }
    rebuild_ws_url();
    connect();
    return true;
}

void WsSession::schedule_poll_reconnect()
{
    if (_stopping.load()) return;
    int idx = _backoff_index.load();
    if (idx > kBackoffMax) idx = kBackoffMax;
    else _backoff_index.fetch_add(1);
    uint32_t now = (uint32_t)(esp_timer_get_time() / 1000);
    _reconnect_after_ms.store(now + kBackoffMs[idx]);
    mclog::tagInfo(TAG, "reconnect in {}ms (attempt {})", (int)kBackoffMs[idx], idx + 1);
}

void WsSession::sendJson(const std::string& json)
{
    if (!_client) return;
    auto handle = static_cast<esp_websocket_client_handle_t>(_client);
    if (!esp_websocket_client_is_connected(handle)) return;
    esp_websocket_client_send_text(handle, json.c_str(),
                                   static_cast<int>(json.size()), portMAX_DELAY);
}

void WsSession::sendBinary(const uint8_t* data, size_t len)
{
    if (!_client) return;
    auto handle = static_cast<esp_websocket_client_handle_t>(_client);
    if (!esp_websocket_client_is_connected(handle)) return;
    esp_websocket_client_send_bin(handle, reinterpret_cast<const char*>(data),
                                  static_cast<int>(len), portMAX_DELAY);
}

void WsSession::onJson(JsonHandler h) { _json_handler = std::move(h); }
void WsSession::onBinary(BinaryHandler h) { _binary_handler = std::move(h); }
void WsSession::onDisconnect(DisconnectHandler h) { _disconnect_handler = std::move(h); }

static constexpr const char* kNvsNamespace = "openbuddy";
static constexpr const char* kNvsKeyIp    = "server_ip";

void WsSession::save_server_ip(const std::string& ip)
{
    nvs_handle_t handle;
    if (nvs_open(kNvsNamespace, NVS_READWRITE, &handle) != ESP_OK) return;
    nvs_set_str(handle, kNvsKeyIp, ip.c_str());
    nvs_commit(handle);
    nvs_close(handle);
    mclog::tagInfo(TAG, "NVS: saved server IP {}", ip);
}

std::string WsSession::load_server_ip()
{
    nvs_handle_t handle;
    if (nvs_open(kNvsNamespace, NVS_READONLY, &handle) != ESP_OK) return "";
    size_t len = 0;
    if (nvs_get_str(handle, kNvsKeyIp, nullptr, &len) != ESP_OK || len == 0) {
        nvs_close(handle);
        return "";
    }
    std::string ip(len - 1, '\0');
    if (nvs_get_str(handle, kNvsKeyIp, ip.data(), &len) != ESP_OK) {
        nvs_close(handle);
        return "";
    }
    nvs_close(handle);
    mclog::tagInfo(TAG, "NVS: loaded server IP {}", ip);
    return ip;
}

void WsSession::rebuild_ws_url()
{
    std::string ip = resolve_server_ip();
    char url_buf[128];
    std::snprintf(url_buf, sizeof(url_buf),
                  "ws://%s:%u%s?device_id=%s",
                  ip.c_str(), kServerPort, kWsPath, _device_id.c_str());
    _ws_url = url_buf;
    mclog::tagInfo(TAG, "WS URL: {}", _ws_url);
}

std::string WsSession::resolve_server_ip()
{
    if (_mdns_ok) {
        esp_ip4_addr_t addr = {};
        esp_err_t err = mdns_query_a(kMdnsHostname, kMdnsTimeoutMs, &addr);
        if (err == ESP_OK) {
            char ip_str[16];
            esp_ip4addr_ntoa(&addr, ip_str, sizeof(ip_str));
            mclog::tagInfo(TAG, "mDNS resolved {} -> {}", kMdnsHostname, ip_str);
            save_server_ip(ip_str);
            return ip_str;
        }
        mclog::tagWarn(TAG, "mdns_query_a('{}') failed ({})", kMdnsHostname, (int)err);
    }

    std::string nvs_ip = load_server_ip();
    if (!nvs_ip.empty()) {
        mclog::tagInfo(TAG, "Using NVS-stored IP: {}", nvs_ip);
        return nvs_ip;
    }

    mclog::tagWarn(TAG, "Using compile-time fallback IP: {}", OPENBUDDY_FALLBACK_IP);
    return OPENBUDDY_FALLBACK_IP;
}

void WsSession::connect()
{
    if (_stopping.load()) return;

    esp_websocket_client_config_t cfg = {};
    cfg.uri                    = _ws_url.c_str();
    cfg.buffer_size            = 16384;
    cfg.disable_auto_reconnect = true;
    cfg.reconnect_timeout_ms   = 5000;
    cfg.network_timeout_ms     = 10000;
    cfg.pingpong_timeout_sec   = 10;
    cfg.keep_alive_enable      = true;
    cfg.keep_alive_idle        = 15;
    cfg.keep_alive_interval    = 5;
    cfg.keep_alive_count       = 3;

    auto handle = esp_websocket_client_init(&cfg);
    if (!handle) {
        mclog::tagError(TAG, "esp_websocket_client_init failed");
        schedule_poll_reconnect();
        return;
    }
    _client = handle;

    esp_websocket_register_events(handle, WEBSOCKET_EVENT_ANY, ws_event_dispatch, this);

    esp_err_t err = esp_websocket_client_start(handle);
    if (err != ESP_OK) {
        mclog::tagError(TAG, "esp_websocket_client_start failed: {}", (int)err);
        esp_websocket_client_destroy(handle);
        _client = nullptr;
        schedule_poll_reconnect();
        return;
    }
    mclog::tagInfo(TAG, "ws client started, awaiting CONNECTED event");
}

void WsSession::send_hello()
{
    char buf[256];
    int n = std::snprintf(buf, sizeof(buf),
        "{\"type\":\"hello\",\"device_id\":\"%s\",\"fw_version\":\"%s\",\"device_name\":\"StopWatch\"}",
        _device_id.c_str(), kFwVersion);
    if (n <= 0) return;
    esp_websocket_client_send_text(
        static_cast<esp_websocket_client_handle_t>(_client),
        buf, n, portMAX_DELAY);
    mclog::tagInfo(TAG, "hello sent (device_id={} fw={})", _device_id, kFwVersion);
}

void WsSession::ws_event_dispatch(void* arg, const char* /*base*/, int32_t id, void* data)
{
    static_cast<WsSession*>(arg)->handle_ws_event(id, data);
}

void WsSession::handle_ws_event(int32_t id, void* data)
{
    switch (id) {
        case WEBSOCKET_EVENT_CONNECTED:
            mclog::tagInfo(TAG, "WS connected");
            _backoff_index.store(0);
            _last_rx_ms.store((uint32_t)(esp_timer_get_time() / 1000));
            {
                std::string url = _ws_url;
                auto scheme_end = url.find("://");
                if (scheme_end != std::string::npos) {
                    auto start = scheme_end + 3;
                    auto end = url.find(':', start);
                    if (end != std::string::npos) {
                        save_server_ip(url.substr(start, end - start));
                    }
                }
            }
            send_hello();
            break;

        case WEBSOCKET_EVENT_DISCONNECTED:
            mclog::tagInfo(TAG, "WS disconnected");
            _ready.store(false);
            schedule_poll_reconnect();
            if (_disconnect_handler) _disconnect_handler();
            break;

        case WEBSOCKET_EVENT_ERROR:
            mclog::tagError(TAG, "WS error");
            break;

        case WEBSOCKET_EVENT_DATA: {
            _last_rx_ms.store((uint32_t)(esp_timer_get_time() / 1000));
            auto* d = static_cast<esp_websocket_event_data_t*>(data);
            if (!d || d->data_len <= 0) break;

            if (d->op_code == 0x02) {
                if (_binary_handler) {
                    _binary_handler(reinterpret_cast<const uint8_t*>(d->data_ptr),
                                    static_cast<size_t>(d->data_len));
                }
                break;
            }

            if (d->op_code != 0x01) break;

            if (d->payload_len > d->data_len) {
                mclog::tagWarn(TAG, "fragmented text frame ignored (data_len={} payload_len={})",
                    (int)d->data_len, (int)d->payload_len);
                break;
            }

            std::string text(d->data_ptr, static_cast<size_t>(d->data_len));
            if (!_ready.load() && text.find("\"ready\"") != std::string::npos) {
                _ready.store(true);
                mclog::tagInfo(TAG, "server ready");
            }

            if (_json_handler) {
                _json_handler(text);
            }
            break;
        }

        default:
            break;
    }
}

}  // namespace app_openbuddy
