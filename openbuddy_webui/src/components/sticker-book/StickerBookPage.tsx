import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { ICON_REGISTRY, useIconMap, type IconEntry } from "@/lib/icons";

const COLLECTIONS = [
  { prefix: "fluent-emoji-flat", label: "Fluent Flat", dot: "#FF6B9D" },
  { prefix: "flat-color-icons", label: "Flat Color", dot: "#FFA502" },
  { prefix: "glyphs-poly", label: "Glyphs Poly", dot: "#7BC67E" },
  { prefix: "streamline-stickies-color", label: "Stickies", dot: "#BA8FDB" },
  { prefix: "openmoji", label: "OpenMoji", dot: "#FFD93D" },
  { prefix: "noto-v1", label: "Noto v1", dot: "#64B5F6" },
];

const GROUP_META: Record<string, { emoji: string; cls: string; bg: string; sub: string }> = {
  "导航": { emoji: "🧭", cls: "text-candy-pink",   bg: "bg-candy-pink/20",   sub: "border-candy-pink/25 bg-candy-pink/[0.05]" },
  "状态": { emoji: "💡", cls: "text-candy-blue",   bg: "bg-candy-blue/20",   sub: "border-candy-blue/25 bg-candy-blue/[0.05]" },
  "操作": { emoji: "✂️", cls: "text-candy-green",  bg: "bg-candy-green/20",  sub: "border-candy-green/25 bg-candy-green/[0.05]" },
  "物品": { emoji: "🎁", cls: "text-candy-purple", bg: "bg-candy-purple/20", sub: "border-candy-purple/25 bg-candy-purple/[0.05]" },
  "文件": { emoji: "📦", cls: "text-candy-orange", bg: "bg-candy-orange/20", sub: "border-candy-orange/25 bg-candy-orange/[0.05]" },
  "聊天": { emoji: "💬", cls: "text-candy-yellow", bg: "bg-candy-yellow/20", sub: "border-candy-yellow/25 bg-candy-yellow/[0.05]" },
};

const GROUP_KEY_MAP: Record<string, string> = {
  "导航": "navigation",
  "状态": "status",
  "操作": "actions",
  "物品": "items",
  "文件": "files",
  "聊天": "chat",
};

interface SearchGroup {
  prefix: string;
  label: string;
  icons: string[];
}

function iconSvgUrl(iconId: string) {
  const [prefix, name] = iconId.split(":");
  return `https://api.iconify.design/${prefix}/${name}.svg`;
}

const entries = Object.entries(ICON_REGISTRY) as [string, IconEntry][];

const groupedEntries = entries.reduce<Record<string, [string, IconEntry][]>>((acc, pair) => {
  const group = pair[1].group;
  (acc[group] ??= []).push(pair);
  return acc;
}, {});

function SearchPanel({
  slotName,
  entry,
  currentIconId,
  onSelect,
  onReset,
}: {
  slotName: string;
  entry: IconEntry;
  currentIconId: string;
  onSelect: (iconId: string) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(entry.keywords);
  const [results, setResults] = useState<SearchGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController>();
  const isCustomized = currentIconId !== entry.default;

  function fetchStickers(q: string) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const keywords = q.trim().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    const limit = keywords.length === 1 ? 36 : 24;
    Promise.all(
      COLLECTIONS.map(async ({ prefix, label }) => {
        const perKeyword = await Promise.all(
          keywords.map(async (kw) => {
            const resp = await fetch(
              `https://api.iconify.design/search?query=${encodeURIComponent(kw)}&prefix=${prefix}&limit=${limit}`,
              { signal: ctrl.signal },
            );
            const data = await resp.json();
            return (data.icons || []) as string[];
          }),
        );
        const seen = new Set<string>();
        const icons: string[] = [];
        for (const list of perKeyword) {
          for (const id of list) {
            if (!seen.has(id)) { seen.add(id); icons.push(id); }
          }
        }
        return { prefix, label, icons };
      }),
    )
      .then((res) => { if (!ctrl.signal.aborted) setResults(res); })
      .catch(() => { if (!ctrl.signal.aborted) setResults([]); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
  }

  function doSearch(q: string) {
    setLoading(true);
    setResults(null);
    fetchStickers(q);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStickers(entry.keywords);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalResults = results?.reduce((s, g) => s + g.icons.length, 0) ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Hero preview */}
      <div className="px-5 pt-5 pb-4 xl:px-6 xl:pt-6 flex items-center gap-4">
        <div className="relative group">
          <div className="w-16 h-16 xl:w-20 xl:h-20 rounded-2xl bg-gradient-to-br from-candy-pink/10 via-candy-purple/10 to-candy-blue/10 border-2 border-dashed border-candy-purple/30 flex items-center justify-center transition-transform group-hover:scale-105">
            <Icon icon={currentIconId} width={40} className="xl:!w-12 xl:!h-12 drop-shadow-sm" />
          </div>
          {isCustomized && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-candy-green border-2 border-white flex items-center justify-center text-[0.5rem] text-white font-bold">✓</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg xl:text-xl font-extrabold text-candy-cocoa leading-tight">{t(`stickerBook.iconLabels.${slotName}`)}</h2>
          <p className="text-[0.6875rem] text-candy-caramel/70 font-medium mt-0.5 truncate">
            {t("stickerBook.current", { icon: currentIconId.split(":")[1] })}
          </p>
          {isCustomized && (
            <button
              onClick={onReset}
              className="mt-1.5 text-[0.6875rem] font-bold text-candy-pink hover:text-candy-pink/80 transition-colors inline-flex items-center gap-1"
            >
              <span>↩</span> {t("stickerBook.resetDefault")}
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="mx-5 xl:mx-6 border-t border-candy-border/40" />
      <div className="px-5 py-3 xl:px-6 flex gap-2">
        <div className="flex-1 relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
            placeholder={t("stickerBook.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2.5 border-2 border-candy-border rounded-xl text-sm font-semibold text-candy-cocoa bg-white/60 outline-none focus:border-candy-purple focus:bg-white transition-all"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-candy-caramel/50 text-sm">🔍</span>
        </div>
        <button
          onClick={() => doSearch(query)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-candy-pink to-candy-purple text-white font-bold text-sm hover:scale-[1.03] active:scale-95 transition-transform shadow-sm"
        >
          {t("common.search")}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 xl:px-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-3xl animate-spin">🌀</div>
            <span className="text-sm font-bold text-candy-caramel/60">{t("stickerBook.searching")}</span>
          </div>
        )}
        {!loading && totalResults === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="text-3xl">🫧</div>
            <span className="text-sm font-bold text-candy-caramel/60">{t("stickerBook.noResults")}</span>
          </div>
        )}
        {!loading &&
          results?.map((group) => {
            if (group.icons.length === 0) return null;
            const col = COLLECTIONS.find((c) => c.prefix === group.prefix);
            return (
              <div key={group.prefix} className="mb-5 last:mb-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: col?.dot ?? "#FF6B9D" }} />
                  <span className="text-[0.6875rem] font-extrabold text-candy-cocoa/80 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-[0.625rem] font-bold text-candy-caramel/50">{group.icons.length}</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">
                  {group.icons.map((iconId) => {
                    const shortName = iconId.split(":")[1] || iconId;
                    const isSelected = currentIconId === iconId;
                    return (
                      <button
                        key={iconId}
                        onClick={() => onSelect(iconId)}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md relative ${
                          isSelected
                            ? "bg-candy-green/15 ring-2 ring-candy-green shadow-sm"
                            : "bg-white/60 hover:bg-white/90 ring-1 ring-candy-border/50"
                        }`}
                      >
                        <img src={iconSvgUrl(iconId)} alt={shortName} loading="lazy" className="w-8 h-8 mb-1" />
                        <span className="text-[0.5rem] text-candy-caramel/70 text-center break-all leading-tight font-semibold line-clamp-2">
                          {shortName}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-candy-green text-white flex items-center justify-center text-[0.5rem] font-bold shadow-sm">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function StickerBookPage() {
  const { t } = useTranslation();
  const { map, setIcon, resetIcon, resetAll } = useIconMap();
  const [activeSlot, setActiveSlot] = useState<string>(entries[0][0]);
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(Object.keys(GROUP_META).slice(1)),
  );
  const [helpGroup, setHelpGroup] = useState<string | null>(null);
  const helpTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
        clearTimeout(helpTimerRef.current);
        setHelpGroup(group);
        helpTimerRef.current = setTimeout(() => setHelpGroup(null), 7000);
      } else {
        next.add(group);
        if (helpGroup === group) setHelpGroup(null);
      }
      return next;
    });
  }, [helpGroup]);

  useEffect(() => () => clearTimeout(helpTimerRef.current), []);

  const customizedCount = useMemo(
    () => entries.filter(([name, entry]) => map[name] !== entry.default).length,
    [map],
  );
  const total = entries.length;

  const filteredGrouped = useMemo(() => {
    const q = sidebarFilter.trim().toLowerCase();
    if (!q) return groupedEntries;
    const result: Record<string, [string, IconEntry][]> = {};
    for (const [group, items] of Object.entries(groupedEntries)) {
      const filtered = items.filter(([, e]) =>
        e.label.toLowerCase().includes(q) || e.keywords.toLowerCase().includes(q) || group.includes(q),
      );
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [sidebarFilter]);

  const activeEntry = ICON_REGISTRY[activeSlot];

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 xl:p-4 2xl:p-5">
      {/* Unified card container */}
      <div className="flex flex-col flex-1 min-h-0 glass-card overflow-hidden">
        {/* Compact header inside card */}
        <div className="px-5 py-3 xl:px-6 xl:py-4 border-b border-candy-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl xl:text-2xl candy-title leading-none">{t("stickerBook.header")}</h1>
            <span className="text-[0.6875rem] text-candy-cocoa/50 font-semibold hidden sm:inline">
              {t("stickerBook.subtitle")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-20 xl:w-24 h-1.5 bg-candy-cream-dark rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-candy-pink via-candy-purple to-candy-blue transition-all duration-500"
                  style={{ width: `${(customizedCount / total) * 100}%` }}
                />
              </div>
              <span className="text-[0.625rem] font-bold text-candy-purple whitespace-nowrap">
                {customizedCount}/{total}
              </span>
            </div>
            {customizedCount > 0 && (
              <button
                onClick={resetAll}
                className="text-[0.6875rem] text-candy-caramel hover:text-candy-pink transition-colors font-bold"
              >
                {t("stickerBook.resetAll")}
              </button>
            )}
          </div>
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 min-h-0">
          {/* Left: grouped slot list */}
          <div className="w-44 xl:w-52 2xl:w-60 border-r border-candy-border/60 flex flex-col shrink-0 bg-gradient-to-b from-transparent to-candy-cream/30">
            {/* Sidebar search */}
            <div className="px-3 pt-3 pb-2 shrink-0">
              <div className="relative">
                <input
                  value={sidebarFilter}
                  onChange={(e) => setSidebarFilter(e.target.value)}
                  placeholder={t("stickerBook.filterPlaceholder")}
                  className="w-full pl-7 pr-2 py-1.5 text-[0.6875rem] font-medium text-candy-cocoa bg-white/60 border border-candy-border/50 rounded-lg outline-none focus:border-candy-purple/60 focus:bg-white transition-all placeholder:text-candy-caramel/40"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[0.625rem] text-candy-caramel/40">🔍</span>
                {sidebarFilter && (
                  <button
                    onClick={() => setSidebarFilter("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.625rem] text-candy-caramel/50 hover:text-candy-pink transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Grouped entries */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {Object.keys(filteredGrouped).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-1.5 text-candy-caramel/50">
                  <span className="text-lg">🫧</span>
                  <span className="text-[0.625rem] font-medium">{t("stickerBook.noMatches")}</span>
                </div>
              )}
              {Object.entries(filteredGrouped).map(([group, items]) => {
                const meta = GROUP_META[group] ?? { emoji: "📦", cls: "text-candy-caramel", bg: "bg-candy-cream-dark/40", sub: "border-candy-caramel/25 bg-candy-cream-dark/20" };
                const groupKey = GROUP_KEY_MAP[group] ?? group;
                const collapsed = collapsedGroups.has(group);
                return (
                  <div key={group} className="first:pt-1">
                    {/* Group header — clickable to toggle */}
                    <button
                      onClick={() => toggleGroup(group)}
                      className={`mx-2 mt-2 px-2.5 py-1.5 flex items-center gap-2 w-[calc(100%-1rem)] transition-all hover:brightness-[0.97] ${meta.bg} ${
                        collapsed
                          ? "rounded-lg mb-1"
                          : "rounded-tl-lg rounded-tr-lg rounded-bl-[12px] rounded-br-none"
                      }`}
                    >
                      <span className="text-sm leading-none">{meta.emoji}</span>
                      <span className={`text-[0.6875rem] font-extrabold tracking-wide flex-1 text-left ${meta.cls}`}>
                        {t(`stickerBook.groups.${groupKey}`)}
                      </span>
                    </button>
                    {!collapsed && (
                      <div className={`ml-4 mr-2 mb-1 border-l-2 rounded-br-lg overflow-hidden ${meta.sub}`}>
                        {/* Help text — fades out after 7s */}
                        {helpGroup === group && (
                          <div className={`px-3 py-1 text-[0.6875rem] font-medium text-candy-cocoa/60 leading-relaxed animate-sticker-help-fade ${meta.bg}`}>
                            {t(`stickerBook.groupDescriptions.${groupKey}`)}
                          </div>
                        )}
                        {items.map(([name, entry]) => {
                          const isActive = activeSlot === name;
                          const isCustomized = map[name] !== entry.default;
                          return (
                            <button
                              key={name}
                              onClick={() => setActiveSlot(name)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all ${
                                isActive
                                  ? "bg-white/70 shadow-sm border-r-[3px] border-candy-purple"
                                  : "hover:bg-white/40"
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isActive ? "bg-candy-purple/10" : "bg-candy-cream-dark/50"
                              }`}>
                                <Icon icon={map[name]} width={18} />
                              </div>
                              <span className={`text-xs font-bold truncate ${isActive ? "text-candy-purple" : "text-candy-cocoa/80"}`}>
                                {t(`stickerBook.iconLabels.${name}`)}
                              </span>
                              {isCustomized && (
                                <span className="w-1.5 h-1.5 rounded-full bg-candy-green shrink-0 ml-auto" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: search panel */}
          <div className="flex-1 min-w-0 bg-gradient-to-br from-candy-cream/20 to-candy-purple/[0.03]">
            {activeEntry && (
              <SearchPanel
                key={activeSlot}
                slotName={activeSlot}
                entry={activeEntry}
                currentIconId={map[activeSlot]}
                onSelect={(iconId) => setIcon(activeSlot, iconId)}
                onReset={() => resetIcon(activeSlot)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
