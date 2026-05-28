/*
 * SPDX-FileCopyrightText: 2026 M5Stack Technology CO LTD
 *
 * SPDX-License-Identifier: MIT
 */
#include "app_imu.h"
#include <hal/hal.h>
#include <mooncake.h>
#include <mooncake_log.h>
#include <assets/assets.h>
#include <smooth_lvgl.hpp>
#include <algorithm>
#include <cmath>

AppImu::AppImu()
{
    setAppInfo().name = "IMU";
    setAppInfo().icon = (void*)&icon_imu;
}

void AppImu::onCreate()
{
    mclog::tagInfo(getAppInfo().name, "on create");
}

void AppImu::onOpen()
{
    mclog::tagInfo(getAppInfo().name, "on open");

    _key_manager = std::make_unique<input::KeyManager>();

    LvglLockGuard lock;

    _yaw           = 0.0f;
    _yaw_last_tick = GetHAL().millis();

    _view = std::make_unique<view::ImuView>();
    _view->init(lv_screen_active());
    _view->setBallOffset(0.0f, 0.0f);
    _view->setBallSize(0.0f);
    _view->setOrbitBallAngle(_yaw);
}

void AppImu::onRunning()
{
    if (_key_manager->update() == input::KeyEvent::GoHome) {
        close();
        return;
    }

    LvglLockGuard lock;

    if (_view) {
        GetHAL().updateImuData();

        uint32_t now = GetHAL().millis();
        float dt     = static_cast<float>(now - _yaw_last_tick) / 1000.0f;
        if (dt <= 0.0f) {
            dt = 0.016f;
        }
        _yaw_last_tick = now;

        const auto& imu_data    = GetHAL().getImuData();
        float motion            = std::sqrt(imu_data.gyroX * imu_data.gyroX + imu_data.gyroY * imu_data.gyroY +
                                            imu_data.gyroZ * imu_data.gyroZ);
        float normalized_motion = std::clamp(motion / 180.0f, 0.0f, 1.0f);

        _yaw += imu_data.gyroZ * dt;
        if (_yaw >= 360.0f || _yaw <= -360.0f) {
            _yaw = std::fmod(_yaw, 360.0f);
        }

        _view->setBallOffset(imu_data.accelX, imu_data.accelY);
        _view->setBallSize(normalized_motion);
        _view->setOrbitBallAngle(_yaw);
        _view->setAccelLabelValues(imu_data.accelX, imu_data.accelY, imu_data.accelZ);
        _view->update();
    }
}

void AppImu::onClose()
{
    mclog::tagInfo(getAppInfo().name, "on close");

    _key_manager.reset();

    LvglLockGuard lock;

    _view.reset();
    _yaw           = 0.0f;
    _yaw_last_tick = 0;
}
