import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import {
  getLlmConfig,
  updateLlmConfig,
  deleteLlmConfig,
  listKeys,
  setKey,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "./SettingsLayout";

export function LlmConfigSection() {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiKeyRedacted, setApiKeyRedacted] = useState<string | null>(null);
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

  useEffect(() => {
    getLlmConfig().then((cfg) => {
      setBaseUrl(cfg.base_url);
      setModel(cfg.model);
    });
    listKeys().then((keys) => {
      setApiKeyRedacted(keys["llm"] ?? null);
    });
  }, []);

  async function save() {
    try {
      await updateLlmConfig({
        base_url: baseUrl.trim() || undefined,
        model: model.trim() || undefined,
      });
      if (apiKeyDraft.trim()) {
        await setKey("llm", apiKeyDraft.trim());
        setApiKeyDraft("");
        const keys = await listKeys();
        setApiKeyRedacted(keys["llm"] ?? null);
      }
      showFeedback({ type: "ok", msg: t("common.saved") });
    } catch (err) {
      showFeedback({
        type: "err",
        msg: t("settings.llmConfig.operationFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }

  async function reset() {
    try {
      await deleteLlmConfig();
      const cfg = await getLlmConfig();
      setBaseUrl(cfg.base_url);
      setModel(cfg.model);
      showFeedback({ type: "ok", msg: t("settings.llmConfig.resetDone") });
    } catch (err) {
      showFeedback({
        type: "err",
        msg: t("settings.llmConfig.operationFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }

  return (
    <>
      <SectionHeader
        accent="bg-candy-purple"
        icon={<MappedIcon name="robot" width={16} />}
        title={t("settings.llmConfig.title")}
        subtitle={t("settings.llmConfig.subtitle")}
      />
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-candy-cocoa">
            {t("settings.llmConfig.baseUrl")}
          </div>
          <Input
            placeholder={t("settings.llmConfig.baseUrlPlaceholder")}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-candy-cocoa">
            {t("settings.llmConfig.model")}
          </div>
          <Input
            placeholder={t("settings.llmConfig.modelPlaceholder")}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-candy-cocoa">
            {t("settings.llmConfig.apiKey")}{" "}
            <span className="text-[0.625rem] text-candy-caramel font-normal">
              — {t("settings.llmConfig.apiKeyHint")}
            </span>
          </div>
          <Input
            placeholder={
              apiKeyRedacted ?? t("settings.llmConfig.apiKeyPlaceholder")
            }
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
            type="password"
            autoComplete="off"
            className={`text-xs ${!apiKeyRedacted ? "border-candy-pink bg-candy-pink/5" : ""}`}
          />
        </div>
        <div className="flex gap-2 justify-end items-center">
          {feedback && (
            <span
              className={`text-[0.6875rem] ${feedback.type === "ok" ? "text-candy-green" : "text-candy-pink"}`}
            >
              {feedback.msg}
            </span>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            {t("settings.llmConfig.resetDefault")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            className="bg-gradient-to-r from-candy-orange to-candy-yellow text-white hover:shadow-candy-hover"
          >
            {t("common.save")}
          </Button>
        </div>
      </form>
    </>
  );
}
