/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#pragma once
#include <mooncake.h>
#include <memory>
#include <string>
#include <apps/common/key_manager/key_manager.h>

namespace app_openbuddy {

class AppOpenBuddy : public mooncake::AppAbility {
public:
    AppOpenBuddy();
    void onCreate() override;
    void onOpen() override;
    void onRunning() override;
    void onClose() override;

private:
    std::unique_ptr<input::KeyManager> _key_manager;
    bool _ptt_active = false;
    bool _auth_pending = false;
    std::string _auth_request_id;
};

}  // namespace app_openbuddy
