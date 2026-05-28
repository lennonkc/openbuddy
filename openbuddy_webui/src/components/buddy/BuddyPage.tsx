import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getConfig, updateConfig } from "@/lib/api";
import { PetPreview } from "./PetPreview";
import { SkinGrid } from "./SkinGrid";
import { getSkin, type SkinId } from "./skins";

const SKIN_KEY = "openbuddy.buddy_skin";

export function BuddyPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SkinId>(
    () => (localStorage.getItem(SKIN_KEY) as SkinId) || "royal-crown",
  );

  useEffect(() => {
    getConfig().then((c) => {
      if (c.buddy_skin) setSelected(c.buddy_skin as SkinId);
    });
  }, []);

  function handleSelect(id: SkinId) {
    setSelected(id);
    localStorage.setItem(SKIN_KEY, id);
    updateConfig({ buddy_skin: id });
  }

  const skin = getSkin(selected);

  return (
    <div className="p-5 xl:p-8 2xl:p-10 overflow-y-auto max-w-2xl xl:max-w-4xl 2xl:max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl xl:text-3xl candy-title mb-1">
          {t("buddy.title")}
        </h1>
        <p className="text-xs text-candy-cocoa/60 font-semibold">
          {t("buddy.subtitle")}
        </p>
      </div>
      <div className="space-y-6">
        <PetPreview skin={skin} />
        <SkinGrid selected={selected} onSelect={handleSelect} />
      </div>
    </div>
  );
}
