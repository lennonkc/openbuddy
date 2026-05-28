from openbuddy.voice.sanitize import sanitize_transcript


def test_strips_english_event_tags():
    assert sanitize_transcript("hello (laughter) world") == "hello world"
    assert sanitize_transcript("[Speaker 1] hi") == "hi"
    assert sanitize_transcript("[Music 0:30] go") == "go"


def test_strips_brackets_with_keywords():
    assert sanitize_transcript("ok [pause] go") == "ok go"


def test_keeps_chinese_brackets():
    assert sanitize_transcript("他说（你好）") == "他说（你好）"


def test_keeps_numeric_parens():
    assert sanitize_transcript("step (1) is do this") == "step (1) is do this"


def test_collapses_double_spaces():
    assert sanitize_transcript("hi   there") == "hi there"
