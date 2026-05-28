import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import { getAgentPrompt, setAgentPrompt } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SettingsLayout";

export function AgentPromptSection() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
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
    getAgentPrompt().then((p) => {
      if (p.system_prompt) {
        setPrompt(p.system_prompt);
      } else {
        const defaultPrompt = t("settings.agentPrompt.defaultAgentPrompt");
        setPrompt(defaultPrompt);
        setAgentPrompt(defaultPrompt).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!prompt.trim()) {
      showFeedback({
        type: "err",
        msg: t("settings.agentPrompt.blankError"),
      });
      return;
    }
    try {
      await setAgentPrompt(prompt);
      showFeedback({ type: "ok", msg: t("common.saved") });
    } catch (err) {
      showFeedback({
        type: "err",
        msg: t("settings.agentPrompt.operationFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }

  async function reset() {
    try {
      const defaultPrompt = t("settings.agentPrompt.defaultAgentPrompt");
      await setAgentPrompt(defaultPrompt);
      setPrompt(defaultPrompt);
      showFeedback({ type: "ok", msg: t("settings.agentPrompt.resetDone") });
    } catch (err) {
      showFeedback({
        type: "err",
        msg: t("settings.agentPrompt.operationFailed", {
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
        title={t("settings.agentPrompt.title")}
        subtitle={t("settings.agentPrompt.subtitle")}
      />
      <div className="space-y-4">
        <textarea
          className="w-full min-h-[20rem] bg-candy-cream border-[1.5px] border-candy-border rounded-xl p-2.5 text-[0.6875rem] text-candy-cocoa leading-relaxed resize-y outline-none focus:border-candy-orange transition-colors"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("settings.agentPrompt.placeholder")}
        />
        <div className="flex gap-2 justify-end items-center">
          {feedback && (
            <span
              className={`text-[0.6875rem] ${feedback.type === "ok" ? "text-candy-green" : "text-candy-pink"}`}
            >
              {feedback.msg}
            </span>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            {t("settings.agentPrompt.resetDefault")}
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
      </div>
    </>
  );
}
