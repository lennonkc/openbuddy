/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#pragma once
#include <atomic>
#include <cstdint>
#include <cstddef>
#include <functional>
#include <string>

namespace app_openbuddy {

class WsSession {
public:
    WsSession();
    ~WsSession();

    void start();
    void stop();
    bool isReady() const;
    uint32_t msSinceLastRx() const;
    bool pollReconnect();

    void sendJson(const std::string& json);
    void sendBinary(const uint8_t* data, size_t len);

    using JsonHandler = std::function<void(const std::string&)>;
    using BinaryHandler = std::function<void(const uint8_t*, size_t)>;
    using DisconnectHandler = std::function<void()>;
    void onJson(JsonHandler h);
    void onBinary(BinaryHandler h);
    void onDisconnect(DisconnectHandler h);

private:
    void* _client = nullptr;
    std::string _device_id;
    std::string _ws_url;

    std::atomic<bool>     _ready{false};
    std::atomic<bool>     _stopping{false};
    std::atomic<int>      _backoff_index{0};
    std::atomic<uint32_t> _last_rx_ms{0};
    std::atomic<uint32_t> _reconnect_after_ms{0};
    bool                  _mdns_ok{false};

    JsonHandler       _json_handler;
    BinaryHandler     _binary_handler;
    DisconnectHandler _disconnect_handler;

    void        rebuild_ws_url();
    std::string resolve_server_ip();
    void        save_server_ip(const std::string& ip);
    std::string load_server_ip();
    void        connect();
    void        send_hello();
    void        schedule_poll_reconnect();

    static void ws_event_dispatch(void* arg, const char* base, int32_t id, void* data);
    void        handle_ws_event(int32_t id, void* data);
};

}  // namespace app_openbuddy
