import math
import struct
from pathlib import Path

SAMPLE_RATE = 16000


def generate_done_pcm(out: Path, duration_s: float = 0.3) -> bytes:
    n = int(SAMPLE_RATE * duration_s)
    samples: list[int] = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 880 + 220 * (i / n)  # ramp 880 → 1100 Hz
        amp = (1.0 - i / n) * 0.6 * 32767  # linear decay
        samples.append(int(amp * math.sin(2 * math.pi * freq * t)))
    pcm = b"".join(struct.pack("<h", s) for s in samples)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(pcm)
    return pcm


if __name__ == "__main__":
    target = (
        Path(__file__).resolve().parents[3]
        / "cardputer_adv/main/apps/app_openbuddy/assets/done.pcm"
    )
    generate_done_pcm(target)
    print(f"wrote {target} ({target.stat().st_size} bytes)")
