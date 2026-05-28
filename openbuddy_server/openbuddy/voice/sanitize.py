import re

# 半角方括号一律剥；半角圆括号若含字母（事件标签）则剥，纯数字保留。
_BRACKET_RE = re.compile(r"\[[^\]]*\]")
_PAREN_RE = re.compile(r"\(([^)]*)\)")
_WS_RE = re.compile(r"\s+")


def sanitize_transcript(text: str) -> str:
    text = _BRACKET_RE.sub("", text)

    def _paren_sub(m: re.Match[str]) -> str:
        inner = m.group(1)
        if re.fullmatch(r"\s*\d+(\.\d+)?\s*", inner):
            return m.group(0)
        return ""

    text = _PAREN_RE.sub(_paren_sub, text)
    return _WS_RE.sub(" ", text).strip()
