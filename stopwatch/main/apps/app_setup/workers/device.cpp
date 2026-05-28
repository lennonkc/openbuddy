/*
 * SPDX-FileCopyrightText: 2026 M5Stack Technology CO LTD
 *
 * SPDX-License-Identifier: MIT
 */
#include "workers.h"
#include <assets/assets.h>
#include <mooncake_log.h>
#include <hal/hal.h>
#include <cstdint>
#include <cstdio>
#include <vector>

using namespace smooth_ui_toolkit::lvgl_cpp;
using namespace setup_workers;

static const std::string_view _tag = "Setup-Device";

namespace setup_workers {

class PercentageAdjustView {
public:
    PercentageAdjustView(int initialValue, int minValue, int maxValue, int step)
    {
        _min_value     = minValue;
        _max_value     = maxValue;
        _step          = step > 0 ? step : 1;
        _current_value = normalizeValue(initialValue);

        _panel = std::make_unique<Container>(lv_screen_active());
        _panel->align(LV_ALIGN_CENTER, 0, 0);
        _panel->setSize(466, 466);
        _panel->setRadius(0);
        _panel->setBorderWidth(0);
        _panel->setPaddingAll(0);
        _panel->setBgColor(lv_color_hex(0x000000));
        _panel->setBgOpa(LV_OPA_COVER);
        _panel->removeFlag(LV_OBJ_FLAG_SCROLLABLE);

        _value_label = std::make_unique<Label>(_panel->get());
        _value_label->align(LV_ALIGN_TOP_MID, 0, 54);
        _value_label->setTextFont(&CommissionerMedium108);
        _value_label->setTextColor(lv_color_hex(0xFFFFFF));
        updateValueLabel(_current_value);

        _slider = std::make_unique<Slider>(_panel->get());
        _slider->align(LV_ALIGN_CENTER, 0, -8);
        _slider->setSize(374, 24);
        _slider->setRange(_min_value, _max_value, false);
        _slider->setValue(_current_value);
        _slider->setBgColor(lv_color_hex(0x343434), LV_PART_MAIN);
        _slider->setBgOpa(LV_OPA_COVER, LV_PART_MAIN);
        _slider->setBorderWidth(0, LV_PART_MAIN);
        _slider->setRadius(LV_RADIUS_CIRCLE, LV_PART_MAIN);
        _slider->setBgColor(lv_color_hex(0x4AD78C), LV_PART_INDICATOR);
        _slider->setBgOpa(LV_OPA_COVER, LV_PART_INDICATOR);
        _slider->setBorderWidth(0, LV_PART_INDICATOR);
        _slider->setRadius(LV_RADIUS_CIRCLE, LV_PART_INDICATOR);
        lv_obj_set_style_bg_color(_slider->get(), lv_color_hex(0xFFFFFF), LV_PART_KNOB);
        lv_obj_set_style_bg_opa(_slider->get(), LV_OPA_COVER, LV_PART_KNOB);
        lv_obj_set_style_border_width(_slider->get(), 0, LV_PART_KNOB);
        lv_obj_set_style_radius(_slider->get(), LV_RADIUS_CIRCLE, LV_PART_KNOB);
        _slider->onValueChanged().connect([this](int32_t value) {
            if (_syncing_slider) {
                return;
            }

            int normalized = normalizeValue(static_cast<int>(value));
            if (normalized != value) {
                _syncing_slider = true;
                _slider->setValue(normalized);
                _syncing_slider = false;
            }

            _current_value = normalized;
            updateValueLabel(_current_value);
        });

        _ok_button = std::make_unique<Button>(_panel->get());
        _ok_button->align(LV_ALIGN_CENTER, 0, 175);
        _ok_button->setSize(374, 130);
        _ok_button->setRadius(77);
        _ok_button->setBorderWidth(0);
        _ok_button->setShadowWidth(0);
        _ok_button->setBgColor(lv_color_hex(0x4AD78C));
        _ok_button->label().setText("OK");
        _ok_button->label().setTextFont(&lv_font_montserrat_28);
        _ok_button->label().setTextColor(lv_color_hex(0x0F5831));
        _ok_button->label().align(LV_ALIGN_CENTER, 0, 0);
        _ok_button->onClick().connect([this]() { _save_requested = true; });
    }

    int currentValue() const
    {
        return _current_value;
    }

    bool consumeSaveRequested()
    {
        bool requested  = _save_requested;
        _save_requested = false;
        return requested;
    }

private:
    int normalizeValue(int value) const
    {
        int clamped = uitk::clamp(value, _min_value, _max_value);
        int snapped = _min_value + ((clamped - _min_value + _step / 2) / _step) * _step;
        return uitk::clamp(snapped, _min_value, _max_value);
    }

    void updateValueLabel(int value)
    {
        if (!_value_label) {
            return;
        }

        char buffer[4] = {};
        std::snprintf(buffer, sizeof(buffer), "%d", value);
        _value_label->setText(buffer);
    }

    std::unique_ptr<Container> _panel;
    std::unique_ptr<Label> _value_label;
    std::unique_ptr<Slider> _slider;
    std::unique_ptr<Button> _ok_button;
    int _current_value   = 0;
    int _min_value       = 0;
    int _max_value       = 100;
    int _step            = 1;
    bool _save_requested = false;
    bool _syncing_slider = false;
};

class ButtonWorker::ButtonConfigView {
public:
    explicit ButtonConfigView(const Hal::ButtonConfig& initialConfig) : _current_config(initialConfig)
    {
        _panel = std::make_unique<Container>(lv_screen_active());
        _panel->align(LV_ALIGN_CENTER, 0, 0);
        _panel->setSize(466, 466);
        _panel->setRadius(0);
        _panel->setBorderWidth(0);
        _panel->setPaddingAll(0);
        _panel->setBgColor(lv_color_hex(0x000000));
        _panel->setBgOpa(LV_OPA_COVER);
        _panel->removeFlag(LV_OBJ_FLAG_SCROLLABLE);

        createSwitchRow(88, "Button SFX", _current_config.sfxEnabled,
                        [this](bool enabled) { _current_config.sfxEnabled = enabled; });
        createSwitchRow(195, "Button Vibration", _current_config.vibrateEnabled,
                        [this](bool enabled) { _current_config.vibrateEnabled = enabled; });

        _ok_button = std::make_unique<Button>(_panel->get());
        _ok_button->align(LV_ALIGN_CENTER, 0, 175);
        _ok_button->setSize(374, 130);
        _ok_button->setRadius(77);
        _ok_button->setBorderWidth(0);
        _ok_button->setShadowWidth(0);
        _ok_button->setBgColor(lv_color_hex(0x4AD78C));
        _ok_button->label().setText("OK");
        _ok_button->label().setTextFont(&lv_font_montserrat_28);
        _ok_button->label().setTextColor(lv_color_hex(0x0F5831));
        _ok_button->label().align(LV_ALIGN_CENTER, 0, 0);
        _ok_button->onClick().connect([this]() { _save_requested = true; });
    }

    const Hal::ButtonConfig& currentConfig() const
    {
        return _current_config;
    }

    bool consumeSaveRequested()
    {
        bool requested  = _save_requested;
        _save_requested = false;
        return requested;
    }

private:
    void createSwitchRow(int y, const char* title, bool initialValue, const std::function<void(bool)>& onChanged)
    {
        auto row = std::make_unique<Container>(_panel->get());
        row->setSize(374, 119);
        row->align(LV_ALIGN_TOP_MID, 0, y);
        row->setBgColor(lv_color_hex(0x4C4C4C));
        row->setBorderWidth(0);
        row->setShadowWidth(0);
        row->setRadius(60);
        row->setPaddingAll(0);
        row->setBgOpa(LV_OPA_TRANSP);

        auto label = std::make_unique<Label>(row->get());
        label->setText(title);
        label->setTextFont(&lv_font_montserrat_24);
        label->setTextColor(lv_color_hex(0xFFFFFF));
        label->align(LV_ALIGN_LEFT_MID, 36, 0);

        auto switch_widget = std::make_unique<Switch>(row->get());
        switch_widget->setSize(80, 44);
        switch_widget->align(LV_ALIGN_RIGHT_MID, -36, 0);
        switch_widget->setValue(initialValue);
        switch_widget->setBgColor(lv_color_hex(0x3A3A3A), LV_PART_MAIN);
        switch_widget->setBgOpa(LV_OPA_COVER, LV_PART_MAIN);
        switch_widget->setBorderWidth(0, LV_PART_MAIN);
        switch_widget->setRadius(LV_RADIUS_CIRCLE, LV_PART_MAIN);
        lv_obj_set_style_bg_color(switch_widget->get(), lv_color_hex(0xFFFFFF), LV_PART_KNOB);
        lv_obj_set_style_bg_opa(switch_widget->get(), LV_OPA_COVER, LV_PART_KNOB);
        lv_obj_set_style_border_width(switch_widget->get(), 0, LV_PART_KNOB);
        lv_obj_set_style_radius(switch_widget->get(), LV_RADIUS_CIRCLE, LV_PART_KNOB);
        switch_widget->setBgColor(lv_color_hex(0x53BD65), LV_PART_INDICATOR | LV_STATE_CHECKED);
        switch_widget->setBgOpa(LV_OPA_COVER, LV_PART_INDICATOR | LV_STATE_CHECKED);
        switch_widget->setBorderWidth(0, LV_PART_INDICATOR | LV_STATE_CHECKED);
        switch_widget->onValueChanged().connect(onChanged);

        _labels.push_back(std::move(label));
        _switches.push_back(std::move(switch_widget));
        _rows.push_back(std::move(row));
    }

    std::unique_ptr<Container> _panel;
    std::vector<std::unique_ptr<Container>> _rows;
    std::vector<std::unique_ptr<Label>> _labels;
    std::vector<std::unique_ptr<Switch>> _switches;
    std::unique_ptr<Button> _ok_button;
    Hal::ButtonConfig _current_config;
    bool _save_requested = false;
};

}  // namespace setup_workers

BrightnessWorker::BrightnessWorker()
{
    mclog::tagInfo(_tag, "start brightness worker");

    _applied_brightness = GetHAL().getBackLightBrightness();
    _view               = std::make_unique<PercentageAdjustView>(_applied_brightness, 10, 100, 1);
}

void BrightnessWorker::update()
{
    if (_view && _applied_brightness != _view->currentValue()) {
        GetHAL().setBackLightBrightness(_view->currentValue(), false);
        _applied_brightness = _view->currentValue();
    }

    if (_view && _view->consumeSaveRequested()) {
        GetHAL().setBackLightBrightness(_view->currentValue(), true);
        _is_done = true;
    }
}

BrightnessWorker::~BrightnessWorker()
{
}

VolumeWorker::VolumeWorker()
{
    mclog::tagInfo(_tag, "start volume worker");

    _applied_volume = GetHAL().getSpeakerVolume();
    _view           = std::make_unique<PercentageAdjustView>(_applied_volume, 0, 100, 5);
}

void VolumeWorker::update()
{
    if (_view && _applied_volume != _view->currentValue()) {
        GetHAL().setSpeakerVolume(_view->currentValue(), false);
        _applied_volume = _view->currentValue();
    }

    if (_view && _view->consumeSaveRequested()) {
        GetHAL().setSpeakerVolume(_view->currentValue(), true);
        _is_done = true;
    }
}

VolumeWorker::~VolumeWorker()
{
}

ButtonWorker::ButtonWorker()
{
    mclog::tagInfo(_tag, "start button worker");

    _applied_config = GetHAL().getButtonConfig();
    _view           = std::make_unique<ButtonConfigView>(_applied_config);
}

void ButtonWorker::update()
{
    if (_view && (_applied_config.sfxEnabled != _view->currentConfig().sfxEnabled ||
                  _applied_config.vibrateEnabled != _view->currentConfig().vibrateEnabled)) {
        GetHAL().setButtonConfig(_view->currentConfig(), false);
        _applied_config = _view->currentConfig();
    }

    if (_view && _view->consumeSaveRequested()) {
        GetHAL().setButtonConfig(_view->currentConfig(), true);
        _is_done = true;
    }
}

ButtonWorker::~ButtonWorker()
{
}
