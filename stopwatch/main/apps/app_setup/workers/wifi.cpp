/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#include "workers.h"
#include <assets/assets.h>
#include <mooncake_log.h>
#include <hal/hal.h>
#include <apps/app_openbuddy/wifi_manager.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <vector>
#include <string>
#include <cstring>
#include <cstdio>
#include <atomic>

using namespace smooth_ui_toolkit::lvgl_cpp;
using namespace setup_workers;
namespace WifiMgr = app_openbuddy::wifi_manager;

static const std::string_view _tag = "Setup-WiFi";

namespace {

struct ScanContext {
    std::vector<WifiMgr::ApInfo> results;
    std::atomic<bool> done{false};
};

void scan_task_fn(void* arg)
{
    auto* ctx = static_cast<ScanContext*>(arg);
    WifiMgr::scan(ctx->results);
    ctx->done.store(true);
    vTaskDelete(nullptr);
}

const char* rssi_indicator(int8_t rssi)
{
    if (rssi >= -50) return "****";
    if (rssi >= -65) return "*** ";
    if (rssi >= -75) return "**  ";
    return "*   ";
}

}  // namespace

namespace setup_workers {

class WifiWorker::WifiView {
public:
    WifiView()
    {
        _scan_ctx = std::make_unique<ScanContext>();
        buildScanningUi();
        xTaskCreate(scan_task_fn, "wifi_scan", 8192, _scan_ctx.get(), 5, nullptr);
    }

    ~WifiView()
    {
        destroyUi();
    }

    bool isScanDone() const
    {
        return _scan_ctx && _scan_ctx->done.load();
    }

    const std::vector<WifiMgr::ApInfo>& scanResults() const
    {
        return _scan_ctx->results;
    }

    void buildResultsUi(const std::vector<WifiMgr::ApInfo>& aps)
    {
        destroyUi();

        _panel = std::make_unique<Container>(lv_screen_active());
        _panel->setSize(466, 466);
        _panel->align(LV_ALIGN_CENTER, 0, 0);
        _panel->setBgColor(lv_color_hex(0x000000));
        _panel->setBgOpa(LV_OPA_COVER);
        _panel->setBorderWidth(0);
        _panel->setRadius(0);
        _panel->setPadding(0, 72, 0, 0);
        _panel->setScrollDir(LV_DIR_VER);
        _panel->setScrollbarMode(LV_SCROLLBAR_MODE_ACTIVE);

        int cursor_y = 36;

        // Section title
        auto title = std::make_unique<Label>(_panel->get());
        title->setText("WiFi");
        title->setTextFont(&MontserratSemiBold26);
        title->setTextColor(lv_color_hex(0xFFFFFF));
        title->align(LV_ALIGN_TOP_MID, 0, cursor_y);
        _labels.push_back(std::move(title));
        cursor_y += 28 + 12;

        // Status line
        std::string status_text;
        if (WifiMgr::isConnected()) {
            status_text = "Connected: " + WifiMgr::currentSsid();
        } else {
            status_text = "Not Connected";
        }
        auto status = std::make_unique<Label>(_panel->get());
        status->setText(status_text);
        status->setTextFont(&lv_font_montserrat_18);
        status->setTextColor(lv_color_hex(0x9A9A9A));
        status->align(LV_ALIGN_TOP_MID, 0, cursor_y);
        status->setWidth(374);
        status->setTextAlign(LV_TEXT_ALIGN_CENTER);
        _labels.push_back(std::move(status));
        cursor_y += 24 + 20;

        // AP list
        size_t max_display = aps.size() > 15 ? 15 : aps.size();
        for (size_t i = 0; i < max_display; ++i) {
            const auto& ap = aps[i];

            char label_text[48];
            std::snprintf(label_text, sizeof(label_text), "%s %s %s",
                          ap.secured ? "[*]" : "[ ]", rssi_indicator(ap.rssi), ap.ssid);

            auto btn = std::make_unique<Button>(_panel->get());
            btn->setSize(374, 90);
            btn->align(LV_ALIGN_TOP_MID, 0, cursor_y);
            btn->setBgColor(lv_color_hex(0x4C4C4C));
            btn->setBorderWidth(0);
            btn->setShadowWidth(0);
            btn->setRadius(45);

            btn->label().setText(label_text);
            btn->label().setTextFont(&lv_font_montserrat_18);
            btn->label().setTextColor(lv_color_hex(0xFFFFFF));
            btn->label().align(LV_ALIGN_CENTER, 0, 0);
            btn->label().setWidth(320);
            btn->label().setTextAlign(LV_TEXT_ALIGN_LEFT);
            btn->label().setLongMode(LV_LABEL_LONG_MODE_SCROLL_CIRCULAR);

            int index = static_cast<int>(i);
            btn->onClick().connect([this, index]() { _selected_ap = index; });

            _buttons.push_back(std::move(btn));
            cursor_y += 90 + 14;
        }

        if (aps.empty()) {
            auto empty = std::make_unique<Label>(_panel->get());
            empty->setText("No networks found");
            empty->setTextFont(&lv_font_montserrat_22);
            empty->setTextColor(lv_color_hex(0x696969));
            empty->align(LV_ALIGN_TOP_MID, 0, cursor_y + 40);
            _labels.push_back(std::move(empty));
        }

        cursor_y += 20;
    }

    void buildPasswordUi(const std::string& ssid)
    {
        destroyUi();
        _selected_ssid = ssid;

        _panel = std::make_unique<Container>(lv_screen_active());
        _panel->setSize(466, 466);
        _panel->align(LV_ALIGN_CENTER, 0, 0);
        _panel->setBgColor(lv_color_hex(0x000000));
        _panel->setBgOpa(LV_OPA_COVER);
        _panel->setBorderWidth(0);
        _panel->setRadius(0);
        _panel->setPaddingAll(0);
        _panel->removeFlag(LV_OBJ_FLAG_SCROLLABLE);

        auto title = std::make_unique<Label>(_panel->get());
        title->setText(ssid);
        title->setTextFont(&lv_font_montserrat_22);
        title->setTextColor(lv_color_hex(0xFFFFFF));
        title->align(LV_ALIGN_TOP_MID, 0, 40);
        title->setWidth(374);
        title->setTextAlign(LV_TEXT_ALIGN_CENTER);
        title->setLongMode(LV_LABEL_LONG_MODE_SCROLL_CIRCULAR);
        _labels.push_back(std::move(title));

        _textarea = lv_textarea_create(_panel->get());
        lv_textarea_set_placeholder_text(_textarea, "Password");
        lv_textarea_set_password_mode(_textarea, true);
        lv_textarea_set_one_line(_textarea, true);
        lv_obj_set_size(_textarea, 300, 45);
        lv_obj_align(_textarea, LV_ALIGN_TOP_MID, 0, 75);
        lv_obj_set_style_bg_color(_textarea, lv_color_hex(0x343434), LV_PART_MAIN);
        lv_obj_set_style_bg_opa(_textarea, LV_OPA_COVER, LV_PART_MAIN);
        lv_obj_set_style_border_color(_textarea, lv_color_hex(0x4AD78C), LV_PART_MAIN);
        lv_obj_set_style_border_width(_textarea, 2, LV_PART_MAIN);
        lv_obj_set_style_text_color(_textarea, lv_color_hex(0xFFFFFF), LV_PART_MAIN);
        lv_obj_set_style_text_font(_textarea, &lv_font_montserrat_18, LV_PART_MAIN);
        lv_obj_set_style_radius(_textarea, 12, LV_PART_MAIN);
        lv_obj_set_style_pad_all(_textarea, 8, LV_PART_MAIN);

        auto connect_btn = std::make_unique<Button>(_panel->get());
        connect_btn->setSize(300, 50);
        connect_btn->align(LV_ALIGN_TOP_MID, 0, 130);
        connect_btn->setRadius(25);
        connect_btn->setBorderWidth(0);
        connect_btn->setShadowWidth(0);
        connect_btn->setBgColor(lv_color_hex(0x4AD78C));
        connect_btn->label().setText("Connect");
        connect_btn->label().setTextFont(&lv_font_montserrat_22);
        connect_btn->label().setTextColor(lv_color_hex(0x0F5831));
        connect_btn->label().align(LV_ALIGN_CENTER, 0, 0);
        connect_btn->onClick().connect([this]() { _connect_requested = true; });
        _buttons.push_back(std::move(connect_btn));

        _keyboard = lv_keyboard_create(_panel->get());
        lv_keyboard_set_textarea(_keyboard, _textarea);
        lv_obj_set_size(_keyboard, 466, 260);
        lv_obj_align(_keyboard, LV_ALIGN_BOTTOM_MID, 0, 0);
        lv_obj_set_style_bg_color(_keyboard, lv_color_hex(0x1A1A1A), LV_PART_MAIN);
        lv_obj_set_style_bg_opa(_keyboard, LV_OPA_COVER, LV_PART_MAIN);
        lv_obj_set_style_border_width(_keyboard, 0, LV_PART_MAIN);

        lv_obj_add_event_cb(_keyboard, kb_ready_cb, LV_EVENT_READY, this);
        lv_obj_add_event_cb(_keyboard, kb_cancel_cb, LV_EVENT_CANCEL, this);
    }

    void buildConnectingUi(const std::string& ssid)
    {
        destroyUi();

        _panel = std::make_unique<Container>(lv_screen_active());
        _panel->setSize(466, 466);
        _panel->align(LV_ALIGN_CENTER, 0, 0);
        _panel->setBgColor(lv_color_hex(0x000000));
        _panel->setBgOpa(LV_OPA_COVER);
        _panel->setBorderWidth(0);
        _panel->setRadius(0);
        _panel->setPaddingAll(0);
        _panel->removeFlag(LV_OBJ_FLAG_SCROLLABLE);

        std::string text = "Connecting to\n" + ssid + " ...";
        auto label = std::make_unique<Label>(_panel->get());
        label->setText(text);
        label->setTextFont(&lv_font_montserrat_22);
        label->setTextColor(lv_color_hex(0xFFFFFF));
        label->align(LV_ALIGN_CENTER, 0, 0);
        label->setWidth(374);
        label->setTextAlign(LV_TEXT_ALIGN_CENTER);
        _labels.push_back(std::move(label));
    }

    void buildDoneUi(bool success, const std::string& ssid)
    {
        destroyUi();

        _panel = std::make_unique<Container>(lv_screen_active());
        _panel->setSize(466, 466);
        _panel->align(LV_ALIGN_CENTER, 0, 0);
        _panel->setBgColor(lv_color_hex(0x000000));
        _panel->setBgOpa(LV_OPA_COVER);
        _panel->setBorderWidth(0);
        _panel->setRadius(0);
        _panel->setPaddingAll(0);
        _panel->removeFlag(LV_OBJ_FLAG_SCROLLABLE);

        std::string text;
        uint32_t color;
        if (success) {
            text = "Connected to\n" + ssid;
            color = 0x4AD78C;
        } else {
            text = "Failed to connect to\n" + ssid;
            color = 0xFF6B6B;
        }

        auto label = std::make_unique<Label>(_panel->get());
        label->setText(text);
        label->setTextFont(&lv_font_montserrat_22);
        label->setTextColor(lv_color_hex(color));
        label->align(LV_ALIGN_CENTER, 0, -40);
        label->setWidth(374);
        label->setTextAlign(LV_TEXT_ALIGN_CENTER);
        _labels.push_back(std::move(label));

        auto ok_btn = std::make_unique<Button>(_panel->get());
        ok_btn->align(LV_ALIGN_CENTER, 0, 175);
        ok_btn->setSize(374, 130);
        ok_btn->setRadius(77);
        ok_btn->setBorderWidth(0);
        ok_btn->setShadowWidth(0);
        ok_btn->setBgColor(lv_color_hex(0x4AD78C));
        ok_btn->label().setText("OK");
        ok_btn->label().setTextFont(&lv_font_montserrat_28);
        ok_btn->label().setTextColor(lv_color_hex(0x0F5831));
        ok_btn->label().align(LV_ALIGN_CENTER, 0, 0);
        ok_btn->onClick().connect([this]() { _done_confirmed = true; });
        _buttons.push_back(std::move(ok_btn));
    }

    int consumeSelectedAp()
    {
        int val = _selected_ap;
        _selected_ap = -1;
        return val;
    }

    bool consumeConnectRequested()
    {
        bool val = _connect_requested;
        _connect_requested = false;
        return val;
    }

    bool consumeCancelRequested()
    {
        bool val = _cancel_requested;
        _cancel_requested = false;
        return val;
    }

    bool consumeDoneConfirmed()
    {
        bool val = _done_confirmed;
        _done_confirmed = false;
        return val;
    }

    std::string getPassword() const
    {
        if (!_textarea) return "";
        return lv_textarea_get_text(_textarea);
    }

private:
    void buildScanningUi()
    {
        _panel = std::make_unique<Container>(lv_screen_active());
        _panel->setSize(466, 466);
        _panel->align(LV_ALIGN_CENTER, 0, 0);
        _panel->setBgColor(lv_color_hex(0x000000));
        _panel->setBgOpa(LV_OPA_COVER);
        _panel->setBorderWidth(0);
        _panel->setRadius(0);
        _panel->setPaddingAll(0);
        _panel->removeFlag(LV_OBJ_FLAG_SCROLLABLE);

        auto title = std::make_unique<Label>(_panel->get());
        title->setText("WiFi");
        title->setTextFont(&MontserratSemiBold26);
        title->setTextColor(lv_color_hex(0xFFFFFF));
        title->align(LV_ALIGN_CENTER, 0, -30);
        _labels.push_back(std::move(title));

        auto msg = std::make_unique<Label>(_panel->get());
        msg->setText("Scanning ...");
        msg->setTextFont(&lv_font_montserrat_22);
        msg->setTextColor(lv_color_hex(0x9A9A9A));
        msg->align(LV_ALIGN_CENTER, 0, 10);
        _labels.push_back(std::move(msg));
    }

    void destroyUi()
    {
        _keyboard = nullptr;
        _textarea = nullptr;
        _labels.clear();
        _buttons.clear();
        _panel.reset();
    }

    static void kb_ready_cb(lv_event_t* e)
    {
        auto* self = static_cast<WifiView*>(lv_event_get_user_data(e));
        self->_connect_requested = true;
    }

    static void kb_cancel_cb(lv_event_t* e)
    {
        auto* self = static_cast<WifiView*>(lv_event_get_user_data(e));
        self->_cancel_requested = true;
    }

    std::unique_ptr<Container> _panel;
    std::vector<std::unique_ptr<Label>> _labels;
    std::vector<std::unique_ptr<Button>> _buttons;
    lv_obj_t* _textarea  = nullptr;
    lv_obj_t* _keyboard  = nullptr;
    std::unique_ptr<ScanContext> _scan_ctx;
    std::string _selected_ssid;
    int _selected_ap       = -1;
    bool _connect_requested = false;
    bool _cancel_requested  = false;
    bool _done_confirmed    = false;
};

}  // namespace setup_workers

static constexpr uint32_t CONNECT_TIMEOUT_MS = 8000;

WifiWorker::WifiWorker()
{
    mclog::tagInfo(_tag, "start wifi worker");
    _view = std::make_unique<WifiView>();
}

void WifiWorker::update()
{
    switch (_stage) {
    case Stage::Scanning: {
        if (_view->isScanDone()) {
            _view->buildResultsUi(_view->scanResults());
            _stage = Stage::Results;
        }
        break;
    }
    case Stage::Results: {
        int sel = _view->consumeSelectedAp();
        if (sel >= 0 && sel < static_cast<int>(_view->scanResults().size())) {
            const auto& ap = _view->scanResults()[sel];
            _connecting_ssid = ap.ssid;
            if (!ap.secured) {
                _view->buildConnectingUi(_connecting_ssid);
                WifiMgr::connect(_connecting_ssid.c_str(), "");
                _connect_start = GetHAL().millis();
                _stage = Stage::Connecting;
            } else {
                _view->buildPasswordUi(_connecting_ssid);
                _stage = Stage::Password;
            }
        }
        break;
    }
    case Stage::Password: {
        if (_view->consumeConnectRequested()) {
            std::string password = _view->getPassword();
            _view->buildConnectingUi(_connecting_ssid);
            WifiMgr::connect(_connecting_ssid.c_str(), password.c_str());
            _connect_start = GetHAL().millis();
            _stage = Stage::Connecting;
        } else if (_view->consumeCancelRequested()) {
            _view->buildResultsUi(_view->scanResults());
            _stage = Stage::Results;
        }
        break;
    }
    case Stage::Connecting: {
        if (WifiMgr::isConnected()) {
            _view->buildDoneUi(true, _connecting_ssid);
            _stage = Stage::Done;
        } else if (GetHAL().millis() - _connect_start > CONNECT_TIMEOUT_MS) {
            _view->buildDoneUi(false, _connecting_ssid);
            _stage = Stage::Done;
        }
        break;
    }
    case Stage::Done: {
        if (_view->consumeDoneConfirmed()) {
            _is_done = true;
        }
        break;
    }
    }
}

WifiWorker::~WifiWorker()
{
}
