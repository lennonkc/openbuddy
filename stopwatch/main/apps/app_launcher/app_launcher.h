/*
 * SPDX-FileCopyrightText: 2026 M5Stack Technology CO LTD
 *
 * SPDX-License-Identifier: MIT
 */
#pragma once
#include "view/view.h"
#include <mooncake.h>
#include <mooncake_templates.h>
#include <cstdint>
#include <memory>

class AppLauncher : public mooncake::templates::AppLauncherBase {
public:
    void onLauncherCreate() override;
    void onLauncherOpen() override;
    void onLauncherRunning() override;
    void onLauncherClose() override;
    void onLauncherDestroy() override;

private:
    std::unique_ptr<view::LauncherView> _view;
    bool _is_first_open              = true;
    bool _pending_status_bar_create  = false;
    uint32_t _status_bar_create_tick = 0;
    uint32_t _last_charge_check_tick = 0;
    bool _was_battery_charging       = false;
    bool _should_play_boot_sfx       = true;

    void create_launcher_view();
    void show_guide_page();
};
