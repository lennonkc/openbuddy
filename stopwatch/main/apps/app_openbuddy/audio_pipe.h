/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#pragma once
#include <atomic>
#include <cstdint>
#include <functional>
#include <vector>
#include <freertos/FreeRTOS.h>
#include <freertos/ringbuf.h>
#include <freertos/task.h>

namespace app_openbuddy {

enum class AudioMode { Idle, Uplink, Playback };

class AudioPipe {
public:
    AudioPipe() = default;
    ~AudioPipe() { stopRecording(); }

    void startRecording();
    void stopRecording();
    bool isRecording() const { return _mode.load() == AudioMode::Uplink; }

    using FrameHandler = std::function<void(const uint8_t*, size_t)>;
    void onFrame(FrameHandler h) { _on_frame = std::move(h); }

    void enqueueTtsPcm(const uint8_t* buf, size_t len);
    void onTtsEnd();

private:
    static constexpr int SAMPLE_RATE = 16000;
    static constexpr int FRAME_MS = 20;
    static constexpr size_t FRAME_SAMPLES = SAMPLE_RATE * FRAME_MS / 1000;  // 320
    static constexpr size_t TTS_RING_SIZE = 32 * 1024;
    static constexpr size_t PLAYBACK_CHUNK_SAMPLES = 1024;

    FrameHandler _on_frame;
    std::atomic<AudioMode> _mode{AudioMode::Idle};
    std::atomic<bool> _stop_req{false};
    std::atomic<bool> _task_done{false};
    std::atomic<bool> _tts_stream_end{false};
    TaskHandle_t _task = nullptr;
    RingbufHandle_t _tts_ring = nullptr;

    bool allocRing();
    void enterPlayback();

    static void task_entry(void* arg);
    void run();
    void pump_uplink();
    void pump_playback(uint32_t& idle_empty_since);
};

}  // namespace app_openbuddy
