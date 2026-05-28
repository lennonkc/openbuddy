import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import { PetBody } from "./PetBody";
import { SKINS, type SkinId } from "./skins";

export function SkinGrid({
  selected,
  onSelect,
}: {
  selected: SkinId;
  onSelect: (id: SkinId) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-sm font-bold text-candy-cocoa mb-3">
        {t("buddy.allBuddies")}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 xl:gap-4">
        {SKINS.map((skin) => {
          const isSelected = skin.id === selected;
          const { Gear } = skin;
          return (
            <div
              key={skin.id}
              role="button"
              tabIndex={0}
              className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 bg-white ${
                isSelected
                  ? "ring-2 ring-candy-pink shadow-candy-hover scale-[1.02]"
                  : "ring-1 ring-candy-border hover:ring-2 hover:ring-candy-pink/40 hover:shadow-candy-hover hover:scale-[1.01]"
              }`}
              onClick={() => onSelect(skin.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(skin.id);
                }
              }}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-candy-pink rounded-full flex items-center justify-center shadow-sm">
                  <MappedIcon name="check" width={14} />
                </div>
              )}

              <div
                className="pt-5 pb-3 flex justify-center"
                style={{
                  background: `linear-gradient(180deg, ${skin.color}15 0%, ${skin.color}05 100%)`,
                }}
              >
                <PetBody bodyType={skin.bodyType} className="w-12 h-14 xl:w-14 xl:h-16">
                  <Gear />
                </PetBody>
              </div>

              <div className="px-3 pb-3 pt-2 text-center">
                <div className="text-xs xl:text-sm font-bold text-candy-cocoa">
                  {skin.emoji} {t(`buddy.skins.${skin.id}.nickname`)}
                </div>
                <div className="text-[0.625rem] mt-0.5 font-medium" style={{ color: skin.color }}>
                  {t(`buddy.skins.${skin.id}.tagline`)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
