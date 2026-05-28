import pytest

from openbuddy.ws.protocol import ClientHello, parse_client_frame


def test_parse_hello():
    f = parse_client_frame({"type": "hello", "device_id": "aa", "fw_version": "1"})
    assert isinstance(f, ClientHello)
    assert f.device_id == "aa"


def test_parse_hello_with_device_name():
    f = parse_client_frame(
        {"type": "hello", "device_id": "aa", "fw_version": "1", "device_name": "Cardputer"}
    )
    assert isinstance(f, ClientHello)
    assert f.device_name == "Cardputer"


def test_parse_hello_device_name_defaults_empty():
    f = parse_client_frame({"type": "hello", "device_id": "aa", "fw_version": "1"})
    assert f.device_name == ""


def test_parse_unknown_type_raises():
    with pytest.raises(ValueError):
        parse_client_frame({"type": "garbage"})
