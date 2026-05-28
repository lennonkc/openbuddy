import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onPickDirectory: () => void;
}

export function EmptyState({ onPickDirectory }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 select-none">
      {/* Camping icon with subtle glow */}
      <div className="relative">
        <div className="absolute inset-0 blur-2xl bg-candy-orange/10 rounded-full scale-150" />
        <span className="relative text-6xl xl:text-7xl 2xl:text-8xl drop-shadow-lg" role="img" aria-label="camping">
          🏕️
        </span>
      </div>

      {/* Text group */}
      <div className="flex flex-col items-center gap-1.5">
        <h1 className="text-xl xl:text-2xl candy-title tracking-tight">
          {t("room.empty.title")}
        </h1>
        <p className="text-xs text-candy-caramel">
          {t("room.empty.subtitle")}
        </p>
      </div>

      {/* CTA button */}
      <Button
        onClick={onPickDirectory}
        className="bg-gradient-to-r from-candy-orange to-candy-yellow text-candy-cocoa font-semibold rounded-lg px-6 h-9 shadow-candy hover:shadow-candy-hover hover:from-candy-yellow hover:to-candy-orange transition-all duration-200 border border-candy-border"
      >
        {t("room.empty.cta")}
      </Button>

      {/* Bottom info hint */}
      <p className="text-[0.5625rem] text-candy-caramel/50 mt-2 flex items-center gap-1">
        <span className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-candy-border text-[0.4375rem] leading-none">
          i
        </span>
        <span className="border-b border-dotted border-candy-border">
          {t("room.empty.hint")}
        </span>
      </p>
    </div>
  );
}
