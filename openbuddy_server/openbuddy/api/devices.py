import json
import re
from pathlib import Path

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, field_validator

router = APIRouter(tags=["devices"])


def _devices_path(request: Request) -> Path:
    return request.app.state.settings.cardputer_devices_file


def _read_whitelist(path: Path) -> dict:
    if not path.is_file():
        return {"allowed_mac": [], "names": {}}
    data = json.loads(path.read_text() or "{}")
    data.setdefault("allowed_mac", [])
    data.setdefault("names", {})
    return data


def _write_whitelist(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


class DeviceAdd(BaseModel):
    mac: str
    name: str = "Cardputer ADV"

    @field_validator("mac")
    @classmethod
    def normalize_mac(cls, v: str) -> str:
        cleaned = re.sub(r"[:\-]", "", v).lower()
        if not re.fullmatch(r"[0-9a-f]{12}", cleaned):
            raise ValueError("invalid MAC address format")
        return cleaned


@router.get("/api/devices")
def list_devices(request: Request) -> list[dict]:
    data = _read_whitelist(_devices_path(request))
    current_device = getattr(request.app.state, "connected_device", None)
    current_mac = _normalize_mac(current_device["device_id"]) if current_device else ""
    seen_macs: set[str] = set()
    result = []
    for mac in data["allowed_mac"]:
        norm = _normalize_mac(mac)
        seen_macs.add(norm)
        is_online = current_mac == norm
        result.append(
            {
                "mac": mac,
                "name": data.get("names", {}).get(mac, "Cardputer ADV"),
                "online": is_online,
                "fw_version": (
                    current_device.get("fw_version") if is_online and current_device else None
                ),
                "connected_since": (
                    current_device.get("connected_since") if is_online and current_device else None
                ),
            }
        )
    if current_device and current_mac and current_mac not in seen_macs:
        dev_name = (
            data.get("names", {}).get(current_mac)
            or current_device.get("device_name")
            or current_mac
        )
        result.append(
            {
                "mac": current_mac,
                "name": dev_name,
                "online": True,
                "fw_version": current_device.get("fw_version"),
                "connected_since": current_device.get("connected_since"),
            }
        )
    return result


@router.post("/api/devices", status_code=status.HTTP_201_CREATED)
def add_device(payload: DeviceAdd, request: Request) -> dict[str, str]:
    path = _devices_path(request)
    data = _read_whitelist(path)
    mac_lower = payload.mac.lower()
    if mac_lower not in data["allowed_mac"]:
        data["allowed_mac"].append(mac_lower)
    data["names"][mac_lower] = payload.name
    _write_whitelist(path, data)
    return {"mac": mac_lower}


def _normalize_mac(mac: str) -> str:
    return re.sub(r"[:\-]", "", mac).lower()


@router.delete("/api/devices/{mac}", status_code=status.HTTP_204_NO_CONTENT)
def remove_device(mac: str, request: Request) -> None:
    path = _devices_path(request)
    data = _read_whitelist(path)
    normalized = _normalize_mac(mac)
    data["allowed_mac"] = [m for m in data["allowed_mac"] if m != normalized]
    data["names"].pop(normalized, None)
    _write_whitelist(path, data)


@router.get("/api/mdns")
def mdns_status(request: Request) -> dict:
    mdns_info = getattr(request.app.state, "mdns_info", None)
    if mdns_info is None:
        return {"broadcasting": False, "hostname": "openbuddy.local", "ip": "", "port": 0}
    return mdns_info
