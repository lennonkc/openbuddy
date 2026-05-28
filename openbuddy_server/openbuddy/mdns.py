import logging
import socket

from zeroconf import ServiceInfo
from zeroconf.asyncio import AsyncZeroconf

log = logging.getLogger(__name__)

SERVICE_TYPE = "_http._tcp.local."
SERVICE_NAME = "OpenBuddy._http._tcp.local."
HOSTNAME = "openbuddy.local."


def get_local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


async def register_mdns(port: int) -> tuple[AsyncZeroconf, ServiceInfo, dict]:
    ip = get_local_ip()
    info = ServiceInfo(
        type_=SERVICE_TYPE,
        name=SERVICE_NAME,
        port=port,
        server=HOSTNAME,
        addresses=[socket.inet_aton(ip)],
    )
    zc = AsyncZeroconf()
    await zc.async_register_service(info, allow_name_change=True)
    log.info("mDNS registered: %s -> %s:%d", HOSTNAME, ip, port)
    mdns_info = {
        "broadcasting": True,
        "hostname": "openbuddy.local",
        "ip": ip,
        "port": port,
    }
    return zc, info, mdns_info


async def unregister_mdns(zc: AsyncZeroconf, info: ServiceInfo) -> None:
    await zc.async_unregister_service(info)
    await zc.async_close()
    log.info("mDNS unregistered")
