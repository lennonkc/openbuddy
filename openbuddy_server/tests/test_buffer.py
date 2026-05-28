from openbuddy.voice.buffer import AudioBuffer

SR = 16000


def test_append_and_drain():
    b = AudioBuffer()
    b.append(b"\x00\x01" * 1000)
    b.append(b"\x02\x03" * 500)
    assert b.drain() == b"\x00\x01" * 1000 + b"\x02\x03" * 500
    assert b.drain() == b""


def test_caps_at_30s():
    b = AudioBuffer(max_seconds=30)
    one_sec = b"\x00\x00" * SR  # 32000 bytes
    for _ in range(40):
        b.append(one_sec)
    pcm = b.drain()
    assert len(pcm) == 30 * SR * 2
