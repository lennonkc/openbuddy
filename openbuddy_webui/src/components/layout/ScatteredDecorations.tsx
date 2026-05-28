import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { PAGE_DECORATIONS, ALL_DECO_ICONS } from "@/lib/decorations";

function pickRandom(exclude: string): string {
  const candidates = ALL_DECO_ICONS.filter((ic) => ic !== exclude);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function ScatteredDecorations() {
  const { pathname } = useLocation();
  const items = PAGE_DECORATIONS[pathname] ?? PAGE_DECORATIONS["/chat"] ?? [];
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const handleDoubleClick = useCallback(
    (key: string, currentIcon: string) => {
      setOverrides((prev) => ({ ...prev, [key]: pickRandom(currentIcon) }));
    },
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((item, i) => {
        const key = `${pathname}-${i}`;
        const icon = overrides[key] ?? item.icon;
        return (
          <div
            key={key}
            className="pointer-events-auto absolute"
            style={{
              top: item.top,
              left: item.left,
              opacity: item.opacity,
              transform: `rotate(${item.rotate}deg)`,
            }}
            onDoubleClick={() => handleDoubleClick(key, icon)}
          >
            <Icon
              icon={icon}
              width={item.size}
              className="transition-transform duration-300 hover:scale-[1.15]"
            />
          </div>
        );
      })}
    </div>
  );
}
