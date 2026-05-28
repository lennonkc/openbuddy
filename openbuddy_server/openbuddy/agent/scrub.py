import re

_THINKING = re.compile(r"<thinking>.*?</thinking>\s*", re.DOTALL)
_EMOTION_TAG = re.compile(r"<<\s*[a-z_]+\s*>>\s*")
_BRACKET = re.compile(r"[^\S\n]*\[[^\]]*\][^\S\n]*")
_INLINE_WS = re.compile(r"[^\S\n]+")
_TRAILING_WS = re.compile(r"[ \t]+$", re.MULTILINE)
_BLANK_LINES = re.compile(r"\n{3,}")


def scrub_assistant_text(raw: str) -> str:
    raw = _THINKING.sub("", raw)
    raw = _EMOTION_TAG.sub("", raw)
    raw = _BRACKET.sub(" ", raw)
    raw = _INLINE_WS.sub(" ", raw)
    raw = _TRAILING_WS.sub("", raw)
    raw = _BLANK_LINES.sub("\n\n", raw)
    return raw.strip()
