import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import {
  getPermissions,
  updatePermissions,
  type PermissionsConfig,
  type ToolPolicy,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "./SettingsLayout";

const TOOL_ORDER = [
  "bash",
  "read",
  "write",
  "edit",
  "glob",
  "grep",
  "web_fetch",
  "web_search",
] as const;

export function PermissionsSection() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<PermissionsConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const showFeedback = useCallback(
    (fb: { type: "ok" | "err"; msg: string }) => {
      setFeedback(fb);
      clearTimeout(feedbackTimer.current);
      if (fb.type === "ok") {
        feedbackTimer.current = setTimeout(() => setFeedback(null), 2000);
      }
    },
    [],
  );

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getPermissions()
      .then(setConfig)
      .catch(() => setLoadError(true));
  }, []);

  function update(patch: Partial<PermissionsConfig>) {
    if (!config) return;
    setConfig({ ...config, ...patch });
    setDirty(true);
  }

  function updateTool(
    name: string,
    patch: Partial<{ enabled: boolean; policy: ToolPolicy }>,
  ) {
    if (!config) return;
    const tool = config.tools[name] ?? ({
      enabled: true,
      policy: "always_ask",
    } as const);
    setConfig({
      ...config,
      tools: { ...config.tools, [name]: { ...tool, ...patch } },
    });
    setDirty(true);
  }

  async function save() {
    if (!config) return;
    try {
      await updatePermissions(config);
      setDirty(false);
      showFeedback({ type: "ok", msg: t("common.saved") });
    } catch (err) {
      showFeedback({
        type: "err",
        msg: t("settings.permissions.saveFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }

  if (loadError)
    return (
      <>
        <SectionHeader
          accent="bg-candy-yellow"
          icon={<MappedIcon name="shield" width={16} />}
          title={t("settings.permissions.title")}
        />
        <p className="text-xs text-candy-pink">
          {t("settings.permissions.loadFailed")}
        </p>
      </>
    );

  if (!config) return null;

  return (
    <>
      <SectionHeader
        accent="bg-candy-yellow"
        icon={<MappedIcon name="shield" width={16} />}
        title={t("settings.permissions.title")}
        subtitle={t("settings.permissions.subtitle")}
      />
      <div className="space-y-4">
        {/* Global settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-candy-cocoa w-24 shrink-0">
              {t("settings.permissions.defaultPolicy")}
            </label>
            <select
              value={config.default_policy}
              onChange={(e) =>
                update({ default_policy: e.target.value as ToolPolicy })
              }
              className="flex-1 bg-candy-cream border-[1.5px] border-candy-border rounded-lg px-2.5 py-1.5 text-xs text-candy-cocoa outline-none focus:border-candy-orange transition-colors"
            >
              <option value="always_ask">
                {t("settings.permissions.policies.alwaysAsk")}
              </option>
              <option value="always_allow">
                {t("settings.permissions.policies.alwaysAllow")}
              </option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-candy-cocoa w-24 shrink-0">
              {t("settings.permissions.timeout")}
            </label>
            <Input
              type="number"
              min={10}
              max={300}
              value={config.timeout_seconds}
              onChange={(e) =>
                update({
                  timeout_seconds: Math.max(
                    10,
                    Math.min(300, Number(e.target.value) || 60),
                  ),
                })
              }
              className="w-20 text-xs"
            />
            <span className="text-[0.6875rem] text-candy-caramel">
              {t("settings.permissions.seconds")}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.deny_interrupts}
              onChange={(e) => update({ deny_interrupts: e.target.checked })}
              className="accent-candy-orange"
            />
            <span className="text-xs text-candy-cocoa">
              {t("settings.permissions.denyInterrupts")}
            </span>
          </label>
        </div>

        <hr className="border-candy-border/40" />

        {/* Tool list */}
        <div className="space-y-2">
          {TOOL_ORDER.map((name) => {
            const tool = config.tools[name] ?? ({
              enabled: true,
              policy: "always_ask",
            } as const);
            return (
              <div
                key={name}
                className={`flex items-center gap-3 py-1.5 ${!tool.enabled ? "opacity-50" : ""}`}
              >
                <div className="w-28 shrink-0">
                  <div className="text-xs font-medium text-candy-cocoa">
                    {name}
                  </div>
                  <div className="text-[0.625rem] text-candy-caramel">
                    {t(`settings.permissions.tools.${name}`)}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={tool.enabled}
                    onChange={(e) =>
                      updateTool(name, { enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-8 h-[18px] bg-candy-border rounded-full peer peer-checked:bg-candy-orange transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all peer-checked:after:translate-x-[14px]" />
                </label>
                <select
                  value={tool.policy}
                  onChange={(e) =>
                    updateTool(name, { policy: e.target.value as ToolPolicy })
                  }
                  disabled={!tool.enabled}
                  className="bg-candy-cream border-[1.5px] border-candy-border rounded-lg px-2 py-1 text-[0.6875rem] text-candy-cocoa outline-none focus:border-candy-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="always_ask">
                    {t("settings.permissions.policies.alwaysAsk")}
                  </option>
                  <option value="always_allow">
                    {t("settings.permissions.policies.alwaysAllow")}
                  </option>
                </select>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end items-center">
          {feedback && (
            <span
              className={`text-[0.6875rem] ${feedback.type === "ok" ? "text-candy-green" : "text-candy-pink"}`}
            >
              {feedback.msg}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!dirty}
            className="bg-gradient-to-r from-candy-orange to-candy-yellow text-white hover:shadow-candy-hover disabled:opacity-50"
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </>
  );
}
