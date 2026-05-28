/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#include "pet_render.h"
#include <hal/hal.h>
#include <lvgl.h>
#include <smooth_lvgl.hpp>
#include <assets/pet_frames/pet_frames.h>

namespace app_openbuddy {

static constexpr int SCREEN_SIZE = 466;
static constexpr int ANIM_SIZE = 160;

static lv_obj_t* _panel = nullptr;
static lv_obj_t* _animimg = nullptr;
static lv_obj_t* _label_state = nullptr;
static lv_obj_t* _label_hint = nullptr;
static PetState _current_state = static_cast<PetState>(-1);

static const lv_image_dsc_t* idle_frames[] = {
    &pet_idle_0, &pet_idle_1, &pet_idle_2,
    &pet_idle_3, &pet_idle_4, &pet_idle_5,
};
static const lv_image_dsc_t* listening_frames[] = {
    &pet_listening_0, &pet_listening_1, &pet_listening_2,
    &pet_listening_3, &pet_listening_4, &pet_listening_5,
};
static const lv_image_dsc_t* thinking_frames[] = {
    &pet_thinking_0, &pet_thinking_1,
    &pet_thinking_2, &pet_thinking_3,
};
static const lv_image_dsc_t* speaking_frames[] = {
    &pet_speaking_0, &pet_speaking_1, &pet_speaking_2,
    &pet_speaking_3, &pet_speaking_4, &pet_speaking_5,
};
static const lv_image_dsc_t* error_frames[] = {
    &pet_error_0, &pet_error_1,
    &pet_error_2, &pet_error_3,
};
static const lv_image_dsc_t* disconnected_frames[] = {
    &pet_disconnected_0,
};
// authorizing 复用 thinking 动画帧
static const lv_image_dsc_t* authorizing_frames[] = {
    &pet_thinking_0, &pet_thinking_1,
    &pet_thinking_2, &pet_thinking_3,
};

struct StateAnim {
    const lv_image_dsc_t** frames;
    size_t count;
    uint32_t duration;
    uint32_t reverse_duration;
    const char* text;
};

static StateAnim animOf(PetState s)
{
    switch (s) {
        case PetState::idle:
            return {(const lv_image_dsc_t**)idle_frames, 6, 1500, 1500, "Idle"};
        case PetState::listening:
            return {(const lv_image_dsc_t**)listening_frames, 6, 1200, 1200, "Listening..."};
        case PetState::thinking:
            return {(const lv_image_dsc_t**)thinking_frames, 4, 1600, 1600, "Thinking..."};
        case PetState::speaking:
            return {(const lv_image_dsc_t**)speaking_frames, 6, 1200, 1200, "Speaking..."};
        case PetState::error:
            return {(const lv_image_dsc_t**)error_frames, 4, 800, 0, "Error"};
        case PetState::disconnected:
            return {(const lv_image_dsc_t**)disconnected_frames, 1, 0, 0, "Disconnected"};
        case PetState::authorizing:
            return {(const lv_image_dsc_t**)authorizing_frames, 4, 800, 800, "Authorize?"};
    }
    return {(const lv_image_dsc_t**)disconnected_frames, 1, 0, 0, "Unknown"};
}

void petRenderInit()
{
    _panel = lv_obj_create(lv_screen_active());
    lv_obj_set_size(_panel, SCREEN_SIZE, SCREEN_SIZE);
    lv_obj_align(_panel, LV_ALIGN_CENTER, 0, 0);
    lv_obj_set_style_bg_color(_panel, lv_color_black(), 0);
    lv_obj_set_style_bg_opa(_panel, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(_panel, 0, 0);
    lv_obj_set_style_pad_all(_panel, 0, 0);
    lv_obj_remove_flag(_panel, LV_OBJ_FLAG_SCROLLABLE);

    _animimg = lv_animimg_create(_panel);
    lv_obj_set_size(_animimg, ANIM_SIZE, ANIM_SIZE);
    lv_obj_align(_animimg, LV_ALIGN_CENTER, 0, -40);

    _label_state = lv_label_create(_panel);
    lv_obj_set_style_text_font(_label_state, &lv_font_montserrat_28, 0);
    lv_obj_set_style_text_color(_label_state, lv_color_white(), 0);
    lv_obj_align(_label_state, LV_ALIGN_CENTER, 0, 90);
    lv_label_set_text(_label_state, "");

    _label_hint = lv_label_create(_panel);
    lv_obj_set_style_text_font(_label_hint, &lv_font_montserrat_16, 0);
    lv_obj_set_style_text_color(_label_hint, lv_color_hex(0x888888), 0);
    lv_obj_align(_label_hint, LV_ALIGN_BOTTOM_MID, 0, -40);
    lv_label_set_text(_label_hint, "Hold right button to talk");

    _current_state = static_cast<PetState>(-1);
}

void petRenderDeinit()
{
    if (_animimg) {
        lv_animimg_delete(_animimg);
    }
    if (_panel) {
        lv_obj_delete(_panel);
        _panel = nullptr;
        _animimg = nullptr;
        _label_state = nullptr;
        _label_hint = nullptr;
    }
}

void renderPet(PetState s)
{
    if (!_panel || !_animimg) return;
    if (s == _current_state) return;
    _current_state = s;

    LvglLockGuard lock;

    auto anim = animOf(s);
    lv_label_set_text(_label_state, anim.text);

    if (_label_hint) {
        if (s == PetState::authorizing)
            lv_label_set_text(_label_hint, "Press left button to approve");
        else
            lv_label_set_text(_label_hint, "Hold right button to talk");
    }

    lv_animimg_delete(_animimg);
    lv_animimg_set_src(_animimg, (const void**)anim.frames, anim.count);

    if (anim.count > 1 && anim.duration > 0) {
        lv_animimg_set_duration(_animimg, anim.duration);
        lv_animimg_set_repeat_count(_animimg, LV_ANIM_REPEAT_INFINITE);
        if (anim.reverse_duration > 0) {
            lv_animimg_set_reverse_duration(_animimg, anim.reverse_duration);
        }
        lv_animimg_start(_animimg);
    }
}

}  // namespace app_openbuddy
