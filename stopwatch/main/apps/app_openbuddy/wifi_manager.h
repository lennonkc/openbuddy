/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#pragma once

#include <vector>
#include <string>
#include <cstdint>

namespace app_openbuddy {
namespace wifi_manager {

struct ApInfo {
    char ssid[33];
    int8_t rssi;
    bool secured;
};

void init();
bool isConnected();
void saveCredentials(const char* ssid, const char* password);
bool scan(std::vector<ApInfo>& results);
bool connect(const char* ssid, const char* password);
std::string currentSsid();

}  // namespace wifi_manager
}  // namespace app_openbuddy
