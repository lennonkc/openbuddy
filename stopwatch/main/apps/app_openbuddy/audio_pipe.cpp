/*
 * SPDX-FileCopyrightText: 2026 openbuddy
 * SPDX-License-Identifier: MIT
 */
#include "audio_pipe.h"
#include <cstring>
#include <hal/hal.h>
#include <mooncake_log.h>

namespace app_openbuddy {

static constexpr const char* TAG = "ob_audio";

bool AudioPipe::allocRing()
{
    if (_tts_ring) return true;
    _tts_ring = xRingbufferCreate(TTS_RING_SIZE, RINGBUF_TYPE_BYTEBUF);
    if (_tts_ring) {
        mclog::tagInfo(TAG, "ringbuf allocated: {}B", TTS_RING_SIZE);
        return true;
    }
    mclog::tagError(TAG, "ringbuf alloc failed");
    return false;
}

void AudioPipe::enterPlayback()
{
    AudioMode cur = _mode.load();
    if (cur == AudioMode::Uplink) {
        stopRecording();
    }
    _mode.store(AudioMode::Playback);
}

void AudioPipe::startRecording()
{
    if (_mode.load() == AudioMode::Uplink) return;

    if (_mode.load() == AudioMode::Playback) {
        _tts_stream_end.store(false);
        if (_tts_ring) {
            size_t out_size = 0;
            while (true) {
                void* item = xRingbufferReceive(_tts_ring, &out_size, 0);
                if (!item) break;
                vRingbufferReturnItem(_tts_ring, item);
            }
        }
    }

    _stop_req.store(false);
    _task_done.store(false);
    _mode.store(AudioMode::Uplink);

    if (!_task) {
        auto rc = xTaskCreate(task_entry, "ob_audio", 8192, this, 5, &_task);
        if (rc != pdPASS) {
            mclog::tagError(TAG, "xTaskCreate failed");
            _mode.store(AudioMode::Idle);
            return;
        }
    }

    mclog::tagInfo(TAG, "startRecording: mode=Uplink");
}

void AudioPipe::stopRecording()
{
    if (_mode.load() != AudioMode::Uplink) return;

    _stop_req.store(true);
    _mode.store(AudioMode::Idle);

    if (_task) {
        for (int i = 0; i < 50 && !_task_done.load(); ++i) {
            vTaskDelay(pdMS_TO_TICKS(10));
        }
        vTaskDelete(_task);
        _task = nullptr;
        _task_done.store(false);
    }

    mclog::tagInfo(TAG, "stopRecording: mode=Idle");
}

void AudioPipe::enqueueTtsPcm(const uint8_t* buf, size_t len)
{
    if (!buf || len == 0) return;
    len &= ~size_t(1);  // PCM16: force 2-byte alignment
    if (len == 0) return;
    if (!_tts_ring && !allocRing()) return;

    enterPlayback();

    if (!_task) {
        _stop_req.store(false);
        _task_done.store(false);
        auto rc = xTaskCreate(task_entry, "ob_audio", 8192, this, 5, &_task);
        if (rc != pdPASS) {
            mclog::tagError(TAG, "enqueueTtsPcm: xTaskCreate failed");
            return;
        }
    }

    if (xRingbufferSend(_tts_ring, buf, len, 0) != pdTRUE) {
        mclog::tagWarn(TAG, "tts ring full, dropping {} bytes", len);
    }
}

void AudioPipe::onTtsEnd()
{
    mclog::tagInfo(TAG, "onTtsEnd: signalling stream end");
    _tts_stream_end.store(true);
}

void AudioPipe::task_entry(void* arg)
{
    auto* self = static_cast<AudioPipe*>(arg);
    self->run();
    self->_task_done.store(true);
    while (true) {
        vTaskDelay(portMAX_DELAY);
    }
}

void AudioPipe::run()
{
    mclog::tagInfo(TAG, "audio task started");

    if (!_tts_ring) allocRing();

    uint32_t idle_empty_since = 0;

    while (!_stop_req.load()) {
        AudioMode m = _mode.load();
        switch (m) {
            case AudioMode::Uplink:
                idle_empty_since = 0;
                pump_uplink();
                break;
            case AudioMode::Playback:
                pump_playback(idle_empty_since);
                break;
            case AudioMode::Idle:
                idle_empty_since = 0;
                vTaskDelay(pdMS_TO_TICKS(20));
                break;
        }
    }

    mclog::tagInfo(TAG, "audio task exiting");
}

void AudioPipe::pump_uplink()
{
    std::vector<int16_t> buf;
    GetHAL().audioRecord(buf, FRAME_MS, 30.0f);

    if (buf.empty()) {
        vTaskDelay(pdMS_TO_TICKS(5));
        return;
    }

    if (_on_frame) {
        _on_frame(reinterpret_cast<const uint8_t*>(buf.data()),
                  buf.size() * sizeof(int16_t));
    }
}

void AudioPipe::pump_playback(uint32_t& idle_empty_since)
{
    if (!_tts_ring) {
        vTaskDelay(pdMS_TO_TICKS(20));
        return;
    }

    size_t out_size = 0;
    void* item = xRingbufferReceiveUpTo(_tts_ring, &out_size, pdMS_TO_TICKS(20),
                                        PLAYBACK_CHUNK_SAMPLES * sizeof(int16_t));
    if (!item) {
        uint32_t now = xTaskGetTickCount();
        if (idle_empty_since == 0) idle_empty_since = now;

        bool stream_ended = _tts_stream_end.load();
        bool empty_200ms = (now - idle_empty_since) >= pdMS_TO_TICKS(200);

        if (stream_ended || empty_200ms) {
            mclog::tagInfo(TAG, "playback drained (end={} timeout={}), ->Idle",
                           (int)stream_ended, (int)empty_200ms);
            // Write 20ms of silence to flush I2S DMA and avoid end-of-stream pop.
            static const int16_t silence[320] = {};  // 320 samples = 20ms @ 16kHz
            GetHAL().audioWriteRaw(silence, 320);
            _tts_stream_end.store(false);
            _mode.store(AudioMode::Idle);
            idle_empty_since = 0;
        }
        return;
    }

    idle_empty_since = 0;

    out_size &= ~size_t(1);  // PCM16: force 2-byte alignment
    size_t sample_count = out_size / sizeof(int16_t);
    if (sample_count > 0) {
        GetHAL().audioWriteRaw(reinterpret_cast<const int16_t*>(item), sample_count);
    }

    vRingbufferReturnItem(_tts_ring, item);
}

}  // namespace app_openbuddy
