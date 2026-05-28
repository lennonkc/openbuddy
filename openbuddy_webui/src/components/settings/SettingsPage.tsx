import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import { listKeys, setKey } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "./SettingsLayout";
import { AgentPromptSection } from "./AgentPromptSection";
import { LlmConfigSection } from "./LlmConfigSection";
import { PromptsSection } from "./PromptsSection";
import { PermissionsSection } from "./PermissionsSection";
import { DevicesSection } from "./DevicesSection";

const KEY_NAMES = ["elevenlabs", "dashscope"] as const;

type TabId = "keys" | "devices" | "ai" | "permissions";

const TABS: {
  id: TabId;
  icon: ReactNode;
  border: string;
  iconBgActive: string;
  textActive: string;
}[] = [
  {
    id: "keys",
    icon: <MappedIcon name="locked" width={18} />,
    border: "border-candy-orange",
    iconBgActive: "bg-candy-orange/10",
    textActive: "text-candy-orange",
  },
  {
    id: "devices",
    icon: <MappedIcon name="computer" width={18} />,
    border: "border-candy-green",
    iconBgActive: "bg-candy-green/10",
    textActive: "text-candy-green",
  },
  {
    id: "ai",
    icon: <MappedIcon name="robot" width={18} />,
    border: "border-candy-purple",
    iconBgActive: "bg-candy-purple/10",
    textActive: "text-candy-purple",
  },
  {
    id: "permissions",
    icon: <MappedIcon name="shield" width={18} />,
    border: "border-candy-yellow",
    iconBgActive: "bg-candy-yellow/10",
    textActive: "text-candy-yellow",
  },
];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("keys");

  const [keys, setKeys] = useState<Record<string, string | null>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [keyFeedback, setKeyFeedback] = useState<
    Record<string, { type: "ok" | "err"; msg: string }>
  >({});
  const keyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(
    () => () => {
      Object.values(keyTimers.current).forEach(clearTimeout);
    },
    [],
  );

  const showKeyFeedback = useCallback(
    (n: string, fb: { type: "ok" | "err"; msg: string }) => {
      setKeyFeedback((prev) => ({ ...prev, [n]: fb }));
      clearTimeout(keyTimers.current[n]);
      if (fb.type === "ok") {
        keyTimers.current[n] = setTimeout(
          () =>
            setKeyFeedback((prev) => {
              const next = { ...prev };
              delete next[n];
              return next;
            }),
          2000,
        );
      }
    },
    [],
  );

  useEffect(() => {
    listKeys().then(setKeys);
  }, []);

  async function saveKey(n: string) {
    if (!drafts[n]?.trim()) {
      showKeyFeedback(n, {
        type: "err",
        msg: t("settings.apiKeys.enterKeyFirst"),
      });
      return;
    }
    try {
      await setKey(n, drafts[n].trim());
      setDrafts((d) => ({ ...d, [n]: "" }));
      listKeys().then(setKeys);
      showKeyFeedback(n, { type: "ok", msg: t("common.saved") });
    } catch (err) {
      showKeyFeedback(n, {
        type: "err",
        msg: t("settings.apiKeys.saveFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 xl:p-4 2xl:p-5">
      <div className="flex flex-col flex-1 min-h-0 glass-card overflow-hidden">
        <div className="px-5 py-3 xl:px-6 xl:py-4 border-b border-candy-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl xl:text-2xl candy-title leading-none">
              {t("settings.header")}
            </h1>
            <span className="text-[0.6875rem] text-candy-cocoa/50 font-semibold hidden sm:inline">
              {t("settings.subtitle")}
            </span>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <nav className="w-44 xl:w-52 2xl:w-60 border-r border-candy-border/60 shrink-0 flex flex-col pt-3 bg-gradient-to-b from-transparent to-candy-cream/30">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all ${
                    isActive
                      ? `bg-white/70 shadow-sm border-r-[3px] ${tab.border}`
                      : "hover:bg-white/40"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? tab.iconBgActive : "bg-candy-cream-dark/50"
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span
                    className={`text-xs font-bold truncate ${
                      isActive ? tab.textActive : "text-candy-cocoa/80"
                    }`}
                  >
                    {t(`settings.tabs.${tab.id}`)}
                  </span>
                </button>
              );
            })}
          </nav>

        {/* Content panel */}
        <div
          key={activeTab}
          className="flex-1 min-w-0 p-5 xl:p-6 overflow-y-auto scrollbar-hide animate-fade-in-up bg-gradient-to-br from-candy-cream/20 to-candy-purple/[0.03]"
        >
          {activeTab === "keys" && (
            <div className="space-y-6">
              <div>
                <SectionHeader
                  accent="bg-candy-orange"
                  icon={<MappedIcon name="locked" width={16} />}
                  title={t("settings.apiKeys.title")}
                />
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="space-y-3"
                >
                  {KEY_NAMES.map((n) => (
                    <div key={n} className="space-y-1">
                      <div className="text-xs font-medium text-candy-cocoa">
                        {n}{" "}
                        <span className="text-[0.625rem] text-candy-caramel font-normal">
                          — {t(`settings.apiKeys.descriptions.${n}`)}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder={
                            keys[n] ?? t("settings.apiKeys.notSet")
                          }
                          value={drafts[n] ?? ""}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [n]: e.target.value,
                            }))
                          }
                          type="password"
                          autoComplete="off"
                          className={`text-xs ${!keys[n] ? "border-candy-pink bg-candy-pink/5" : ""}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => saveKey(n)}
                        >
                          {keys[n]
                            ? t("common.update")
                            : t("common.set")}
                        </Button>
                        {keyFeedback[n] && (
                          <span
                            className={`text-[0.6875rem] whitespace-nowrap ${keyFeedback[n].type === "ok" ? "text-candy-green" : "text-candy-pink"}`}
                          >
                            {keyFeedback[n].msg}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </form>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-candy-border to-transparent" />

              <div>
                <SectionHeader
                  accent="bg-candy-blue"
                  icon={<MappedIcon name="globe" width={16} />}
                  title={t("settings.language.title")}
                  subtitle={t("settings.language.subtitle")}
                />
                <div className="flex gap-2">
                  {(["en", "zh"] as const).map((lng) => (
                    <button
                      key={lng}
                      onClick={() => i18n.changeLanguage(lng)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        i18n.language.startsWith(lng)
                          ? "bg-gradient-to-r from-candy-orange to-candy-yellow text-white shadow-candy"
                          : "bg-candy-cream border border-candy-border text-candy-cocoa/70 hover:border-candy-orange/50 hover:text-candy-cocoa"
                      }`}
                    >
                      {t(`settings.language.${lng}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "devices" && <DevicesSection />}

          {activeTab === "ai" && (
            <div className="space-y-6">
              <LlmConfigSection />
              <div className="h-px bg-gradient-to-r from-transparent via-candy-border to-transparent" />
              <AgentPromptSection />
              <div className="h-px bg-gradient-to-r from-transparent via-candy-border to-transparent" />
              <PromptsSection />
            </div>
          )}

          {activeTab === "permissions" && <PermissionsSection />}
        </div>
        </div>
      </div>
    </div>
  );
}
