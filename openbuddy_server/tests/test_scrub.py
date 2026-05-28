from openbuddy.agent.scrub import scrub_assistant_text


def test_strips_thinking_block():
    raw = "<thinking>some internal reasoning</thinking>\n\nHello world"
    assert scrub_assistant_text(raw) == "Hello world"


def test_strips_emotion_prefix():
    assert scrub_assistant_text("<<happy>> 你好啊") == "你好啊"


def test_strips_multiple_emotion_tags():
    raw = "<<excited>> First paragraph\n\n<<happy>> Second paragraph"
    assert scrub_assistant_text(raw) == "First paragraph\n\nSecond paragraph"


def test_strips_thinking_then_emotion():
    raw = "<thinking>plan</thinking>\n\n<<excited>> Oh, I love stories!"
    assert scrub_assistant_text(raw) == "Oh, I love stories!"


def test_strips_llm_bracket():
    assert scrub_assistant_text("好 [wink] 没问题") == "好 没问题"


def test_combined_all_noise():
    raw = "<thinking>hmm</thinking>\n\n<<surprised>> 哇 [excited] 真的吗 [video:xyz]"
    assert scrub_assistant_text(raw) == "哇 真的吗"


def test_no_tags_passthrough():
    assert scrub_assistant_text("普通一句") == "普通一句"


def test_preserves_paragraph_breaks():
    assert scrub_assistant_text("段落一\n\n段落二") == "段落一\n\n段落二"


def test_collapses_excessive_blank_lines():
    assert scrub_assistant_text("段落一\n\n\n\n段落二") == "段落一\n\n段落二"


def test_bracket_near_paragraph_break():
    assert scrub_assistant_text("line one [tag]\n\nline two") == "line one\n\nline two"


def test_returns_str():
    result = scrub_assistant_text("hello")
    assert isinstance(result, str)
