import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import {
  getDevices,
  addDevice,
  removeDevice,
  getMdns,
  type Device,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "./SettingsLayout";

function MdnsBanner() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<{
    broadcasting: boolean;
    hostname: string;
    ip: string;
    port: number;
  } | null>(null);

  useEffect(() => {
    getMdns().then(setInfo);
  }, []);

  if (!info) return null;

  return info.broadcasting ? (
    <div className="rounded-xl bg-candy-green/8 border-[1.5px] border-candy-green/30 p-3 flex items-center gap-3">
      <div className="w-8 h-8 bg-candy-green rounded-full flex items-center justify-center shrink-0">
        <MappedIcon name="wifi-on" width={16} />
      </div>
      <div>
        <div className="text-xs font-semibold text-candy-cocoa">
          {t("settings.devices.mdnsBroadcasting")}
        </div>
        <div className="text-[0.625rem] text-candy-green">
          {info.hostname}:{info.port} · {info.ip}
        </div>
      </div>
    </div>
  ) : (
    <div className="rounded-xl bg-candy-pink/8 border-[1.5px] border-candy-pink/30 p-3 flex items-center gap-3">
      <div className="w-8 h-8 bg-candy-pink rounded-full flex items-center justify-center shrink-0">
        <MappedIcon name="wifi-off" width={16} />
      </div>
      <div>
        <div className="text-xs font-semibold text-candy-cocoa">
          {t("settings.devices.mdnsNotBroadcasting")}
        </div>
        <div className="text-[0.625rem] text-candy-pink">
          {t("settings.devices.mdnsWarning")}
        </div>
      </div>
    </div>
  );
}

function DeviceCard({
  device,
  onRemove,
}: {
  device: Device;
  onRemove: (mac: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-xl bg-white/60 border-[1.5px] border-candy-border/60 p-3 flex items-center gap-3 transition-all hover:border-candy-border hover:shadow-candy ${!device.online ? "opacity-50" : ""}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${device.online ? "bg-candy-blue/10" : "bg-candy-caramel/10"}`}
      >
        <MappedIcon name="computer" width={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-candy-cocoa">
            {device.name}
          </span>
          <span
            className={`text-[0.5625rem] px-1.5 py-0.5 rounded-full font-medium ${device.online ? "bg-candy-green/15 text-candy-green" : "bg-candy-caramel/10 text-candy-caramel/60"}`}
          >
            {device.online
              ? t("settings.devices.connected")
              : t("settings.devices.offline")}
          </span>
        </div>
        <div className="text-[0.625rem] text-candy-caramel mt-0.5 truncate">
          MAC: {device.mac}
          {device.fw_version && ` · FW: ${device.fw_version}`}
          {device.connected_since &&
            ` · ${t("settings.devices.connectedAt", { time: new Date(device.connected_since).toLocaleTimeString() })}`}
        </div>
      </div>
      <button
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        onClick={() => onRemove(device.mac)}
      >
        <MappedIcon name="trash" width={18} />
      </button>
    </div>
  );
}

function AddDeviceDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (mac: string, name: string) => void;
}) {
  const { t } = useTranslation();
  const [mac, setMac] = useState("");
  const [name, setName] = useState("Cardputer ADV");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 xl:p-8 w-96 xl:w-[28rem] shadow-xl">
        <h3 className="font-semibold mb-4">
          {t("settings.devices.addDevice")}
        </h3>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-candy-cocoa/80 mb-1">
              {t("settings.devices.macAddress")}
            </div>
            <Input
              placeholder="AA:BB:CC:DD:EE:FF"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              className="text-xs font-mono"
            />
            <div className="text-[0.625rem] text-candy-caramel/70 mt-0.5">
              {t("settings.devices.macHelp")}
            </div>
          </div>
          <div>
            <div className="text-xs text-candy-cocoa/80 mb-1">
              {t("settings.devices.deviceName")}
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onAdd(mac, name);
              setMac("");
              onClose();
            }}
            disabled={!mac.trim()}
          >
            {t("common.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DevicesSection() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  function refresh() {
    getDevices().then(setDevices);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(mac: string, name: string) {
    await addDevice(mac, name);
    refresh();
  }

  async function handleRemove(mac: string) {
    await removeDevice(mac);
    refresh();
  }

  return (
    <>
      <SectionHeader
        accent="bg-candy-green"
        icon={<MappedIcon name="computer" width={16} />}
        title={t("settings.devices.title")}
        subtitle={t("settings.devices.subtitle")}
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <MappedIcon name="plus" width={14} className="mr-1" />
            {t("settings.devices.addDevice")}
          </Button>
        }
      />
      <div className="space-y-3">
        <MdnsBanner />

        {devices.map((d) => (
          <DeviceCard key={d.mac} device={d} onRemove={handleRemove} />
        ))}

        {devices.length === 0 && (
          <div className="border-[1.5px] border-dashed border-candy-border rounded-xl p-4 text-center">
            <div className="text-xs text-candy-caramel mb-1">
              {t("settings.devices.noDevices")}
            </div>
            <div className="text-[0.625rem] text-candy-caramel/60 leading-relaxed">
              {t("settings.devices.noDevicesHelp")}
            </div>
          </div>
        )}
      </div>

      <AddDeviceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
      />
    </>
  );
}
