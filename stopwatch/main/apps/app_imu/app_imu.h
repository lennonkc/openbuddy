/*
 * SPDX-FileCopyrightText: 2026 M5Stack Technology CO LTD
 *
 * SPDX-License-Identifier: MIT
 */
#pragma once
#include "view/view.h"
#include <apps/common/key_manager/key_manager.h>
#include <mooncake.h>
#include <memory>

/**
 * @brief Derived App
 *
 */
class AppImu : public mooncake::AppAbility {
public:
    AppImu();

    // Override lifecycle callbacks
    void onCreate() override;
    void onOpen() override;
    void onRunning() override;
    void onClose() override;

private:
    std::unique_ptr<view::ImuView> _view;
    std::unique_ptr<input::KeyManager> _key_manager;
    float _yaw              = 0.0f;
    uint32_t _yaw_last_tick = 0;
};
