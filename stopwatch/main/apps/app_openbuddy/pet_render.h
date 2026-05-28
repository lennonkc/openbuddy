/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#pragma once
#include <cstdint>

namespace app_openbuddy {

enum class PetState { idle, listening, thinking, speaking, error, disconnected, authorizing };

void petRenderInit();
void petRenderDeinit();
void renderPet(PetState s);

}  // namespace app_openbuddy
