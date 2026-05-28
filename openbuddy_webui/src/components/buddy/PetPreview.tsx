import { useTranslation } from "react-i18next";
import { PetBody } from "./PetBody";
import type { SkinMeta } from "./skins";

const STATES = [
  { id: "idle", emoji: "☁️", bg: "from-green-100 to-emerald-50", ring: "ring-green-200/60" },
  { id: "listening", emoji: "👂", bg: "from-blue-100 to-sky-50", ring: "ring-blue-200/60" },
  { id: "thinking", emoji: "💭", bg: "from-amber-100 to-orange-50", ring: "ring-amber-200/60" },
  { id: "speaking", emoji: "💬", bg: "from-teal-100 to-emerald-50", ring: "ring-teal-200/60" },
  { id: "error", emoji: "😵", bg: "from-red-100 to-rose-50", ring: "ring-red-200/60" },
] as const;

export function PetPreview({ skin }: { skin: SkinMeta }) {
  const { t } = useTranslation();
  const { Gear } = skin;
  return (
    <div className="space-y-5">
      {/* Character showcase card */}
      <div className="glass-card p-5 xl:p-7">
        <div className="flex flex-col xl:flex-row gap-5 xl:gap-7 items-center xl:items-start">
          {/* Pet display stage */}
          <div className="shrink-0">
            <div
              className="w-40 h-44 xl:w-48 xl:h-52 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                background: `radial-gradient(ellipse at 50% 85%, ${skin.color}22 0%, ${skin.color}0a 60%, transparent 100%)`,
              }}
            >
              <div className="pet-idle">
                <PetBody bodyType={skin.bodyType} className="w-[6.5rem] h-[7.5rem] xl:w-[7.5rem] xl:h-[8.5rem]">
                  <Gear />
                </PetBody>
              </div>
            </div>
          </div>

          {/* Character info */}
          <div className="flex-1 space-y-3 text-center xl:text-left min-w-0">
            <div>
              <h2 className="text-xl xl:text-2xl font-black text-candy-cocoa">
                {skin.emoji} {t(`buddy.skins.${skin.id}.nickname`)}
              </h2>
              <div className="text-xs font-bold mt-0.5" style={{ color: skin.color }}>
                {t(`buddy.skins.${skin.id}.tagline`)}
              </div>
            </div>

            {/* Speech bubble */}
            <div className="bg-candy-cream/80 rounded-2xl border-2 border-candy-border py-3.5 px-4 xl:py-4 xl:px-5 relative overflow-hidden">
              <div
                className="text-candy-pink/20 text-6xl font-black leading-none absolute -top-1 left-2 select-none"
                aria-hidden="true"
              >
                {"“"}
              </div>
              <p className="text-sm text-candy-cocoa/90 leading-relaxed relative pl-7">
                {t(`buddy.skins.${skin.id}.intro`)}
              </p>
            </div>

            {/* Story */}
            <div className="rounded-xl p-3.5 xl:p-4 border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-orange-50/40">
              <div className="text-xs font-bold text-candy-orange mb-1.5">
                {t("buddy.buddyStory")}
              </div>
              <p className="text-xs text-candy-cocoa/75 leading-relaxed">{t(`buddy.skins.${skin.id}.story`)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Animation states */}
      <div>
        <div className="text-sm font-bold text-candy-cocoa mb-3">
          {t("buddy.expressionChanges")}
        </div>
        <div className="grid grid-cols-3 xl:grid-cols-5 gap-2.5 xl:gap-3">
          {STATES.map(({ id, emoji, bg, ring }) => (
            <div
              key={id}
              className={`rounded-xl bg-gradient-to-b ${bg} ring-1 ${ring} p-3 xl:p-3.5 flex flex-col items-center gap-2`}
            >
              <div className={`pet-${id}`}>
                <PetBody bodyType={skin.bodyType} className="w-10 h-12 xl:w-12 xl:h-14">
                  <Gear />
                </PetBody>
              </div>
              <div className="text-center">
                <div className="text-sm leading-none">{emoji}</div>
                <div className="text-[0.6875rem] font-bold text-candy-cocoa/60 mt-1">{t(`buddy.states.${id}`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
