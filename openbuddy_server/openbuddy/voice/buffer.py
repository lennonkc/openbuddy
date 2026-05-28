SAMPLE_RATE = 16000


class AudioBuffer:
    def __init__(self, *, max_seconds: int = 30) -> None:
        self._chunks: list[bytes] = []
        self._size = 0
        self._cap = max_seconds * SAMPLE_RATE * 2

    def append(self, pcm: bytes) -> None:
        if self._size + len(pcm) > self._cap:
            pcm = pcm[: self._cap - self._size]
        self._chunks.append(pcm)
        self._size += len(pcm)

    def drain(self) -> bytes:
        out = b"".join(self._chunks)
        self._chunks.clear()
        self._size = 0
        return out
