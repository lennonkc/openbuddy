/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#include "wifi_manager.h"
#include <esp_wifi.h>
#include <esp_event.h>
#include <esp_netif.h>
#include <nvs.h>
#include <esp_log.h>
#include <mooncake_log.h>
#include <cstring>
#include <atomic>
#include <algorithm>
#include <freertos/FreeRTOS.h>
#include <freertos/event_groups.h>

namespace app_openbuddy {
namespace wifi_manager {

static constexpr const char* TAG = "wifi_mgr";
static constexpr const char* NVS_NS = "wifi_cred";
static std::atomic<bool> s_connected{false};
static std::atomic<bool> s_has_credentials{false};
static esp_netif_t* s_sta_netif = nullptr;

static void event_handler(void* arg, esp_event_base_t base, int32_t id, void* data)
{
    if (base == WIFI_EVENT) {
        if (id == WIFI_EVENT_STA_START) {
            if (s_has_credentials.load()) {
                esp_wifi_connect();
            }
        } else if (id == WIFI_EVENT_STA_DISCONNECTED) {
            s_connected.store(false);
            if (s_has_credentials.load()) {
                ESP_LOGW(TAG, "WiFi disconnected, retrying...");
                vTaskDelay(pdMS_TO_TICKS(2000));
                esp_wifi_connect();
            }
        }
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        auto* event = static_cast<ip_event_got_ip_t*>(data);
        ESP_LOGI(TAG, "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
        s_connected.store(true);
    }
}

static bool load_credentials(char* ssid, size_t* ssid_len, char* pass, size_t* pass_len)
{
    nvs_handle_t handle;
    if (nvs_open(NVS_NS, NVS_READONLY, &handle) != ESP_OK) return false;

    esp_err_t err1 = nvs_get_str(handle, "ssid", ssid, ssid_len);
    esp_err_t err2 = nvs_get_str(handle, "pass", pass, pass_len);
    nvs_close(handle);

    return (err1 == ESP_OK && err2 == ESP_OK && std::strlen(ssid) > 0);
}

void init()
{
    esp_err_t ret;

    ret = esp_netif_init();
    if (ret != ESP_OK && ret != ESP_ERR_INVALID_STATE) {
        mclog::tagError(TAG, "netif init failed: {}", (int)ret);
        return;
    }

    ret = esp_event_loop_create_default();
    if (ret != ESP_OK && ret != ESP_ERR_INVALID_STATE) {
        mclog::tagError(TAG, "event loop init failed: {}", (int)ret);
        return;
    }

    if (!s_sta_netif) {
        s_sta_netif = esp_netif_create_default_wifi_sta();
    }

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ret = esp_wifi_init(&cfg);
    if (ret != ESP_OK && ret != ESP_ERR_INVALID_STATE) {
        mclog::tagError(TAG, "wifi init failed: {}", (int)ret);
        return;
    }

    esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, nullptr);
    esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, nullptr);

    char ssid[33] = {};
    char pass[65] = {};
    size_t ssid_len = sizeof(ssid);
    size_t pass_len = sizeof(pass);

    esp_wifi_set_mode(WIFI_MODE_STA);

    if (load_credentials(ssid, &ssid_len, pass, &pass_len)) {
        mclog::tagInfo(TAG, "Connecting to saved SSID: {}", ssid);
        s_has_credentials.store(true);

        wifi_config_t wifi_config = {};
        std::strncpy(reinterpret_cast<char*>(wifi_config.sta.ssid), ssid,
                     sizeof(wifi_config.sta.ssid) - 1);
        std::strncpy(reinterpret_cast<char*>(wifi_config.sta.password), pass,
                     sizeof(wifi_config.sta.password) - 1);

        esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    } else {
        mclog::tagInfo(TAG, "No saved WiFi credentials");
    }

    esp_wifi_start();
}

bool isConnected()
{
    return s_connected.load();
}

void saveCredentials(const char* ssid, const char* password)
{
    nvs_handle_t handle;
    if (nvs_open(NVS_NS, NVS_READWRITE, &handle) != ESP_OK) return;
    nvs_set_str(handle, "ssid", ssid);
    nvs_set_str(handle, "pass", password);
    nvs_commit(handle);
    nvs_close(handle);
    mclog::tagInfo(TAG, "Credentials saved for SSID: {}", ssid);
}

bool scan(std::vector<ApInfo>& results)
{
    wifi_scan_config_t config = {};
    config.show_hidden = false;

    esp_err_t err = esp_wifi_scan_start(&config, true);
    if (err != ESP_OK) {
        mclog::tagError(TAG, "WiFi scan failed: {}", (int)err);
        return false;
    }

    uint16_t count = 0;
    esp_wifi_scan_get_ap_num(&count);
    if (count == 0) return true;

    std::vector<wifi_ap_record_t> records(count);
    esp_wifi_scan_get_ap_records(&count, records.data());

    // Deduplicate by SSID, keeping strongest signal
    for (const auto& r : records) {
        if (r.ssid[0] == '\0') continue;

        const char* name = reinterpret_cast<const char*>(r.ssid);
        bool found = false;
        for (auto& existing : results) {
            if (std::strcmp(existing.ssid, name) == 0) {
                if (r.rssi > existing.rssi) {
                    existing.rssi = r.rssi;
                }
                found = true;
                break;
            }
        }

        if (!found) {
            ApInfo info;
            std::strncpy(info.ssid, name, sizeof(info.ssid) - 1);
            info.ssid[32] = '\0';
            info.rssi = r.rssi;
            info.secured = (r.authmode != WIFI_AUTH_OPEN);
            results.push_back(info);
        }
    }

    std::sort(results.begin(), results.end(),
              [](const ApInfo& a, const ApInfo& b) { return a.rssi > b.rssi; });

    return true;
}

bool connect(const char* ssid, const char* password)
{
    saveCredentials(ssid, password);
    s_has_credentials.store(true);

    esp_wifi_disconnect();

    wifi_config_t config = {};
    std::strncpy(reinterpret_cast<char*>(config.sta.ssid), ssid,
                 sizeof(config.sta.ssid) - 1);
    std::strncpy(reinterpret_cast<char*>(config.sta.password), password,
                 sizeof(config.sta.password) - 1);

    esp_wifi_set_config(WIFI_IF_STA, &config);
    return esp_wifi_connect() == ESP_OK;
}

std::string currentSsid()
{
    wifi_ap_record_t ap;
    if (esp_wifi_sta_get_ap_info(&ap) == ESP_OK) {
        return std::string(reinterpret_cast<const char*>(ap.ssid));
    }
    return "";
}

}  // namespace wifi_manager
}  // namespace app_openbuddy
