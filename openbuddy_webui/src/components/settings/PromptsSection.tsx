import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import { deletePrompts, getPrompts, setPrompts } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SettingsLayout";

export function PromptsSection() {
  const { t } = useTranslation();
  const [stage1, setStage1] = useState(() => t("settings.prompts.defaultStage1"));
  const [stage2, setStage2] = useState(() => t("settings.prompts.defaultStage2"));
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
    getPrompts().then((p) => {
      if (p.stage1) setStage1(p.stage1);
      if (p.stage2) setStage2(p.stage2);
    });
  }, []);

  async function save() {
    try {
      await setPrompts(stage1, stage2);
      showFeedback({ type: "ok", msg: t("common.saved") });
    } catch (err) {
      showFeedback({
        type: "err",
        msg: t("settings.prompts.operationFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }

  async function reset() {
    try {
      await deletePrompts();
      const d1 = t("settings.prompts.defaultStage1");
      const d2 = t("settings.prompts.defaultStage2");
      setStage1(d1);
      setStage2(d2);
      showFeedback({ type: "ok", msg: t("settings.prompts.resetDone") });
    } catch (err) {
      showFeedback({
        type: "err",
        msg: t("settings.prompts.operationFailed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      });
    }
  }

  return (
    <>
      <SectionHeader
        accent="bg-candy-pink"
        icon={<MappedIcon name="pencil" width={16} />}
        title={t("settings.prompts.title")}
        subtitle={t("settings.prompts.subtitle")}
      />
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-candy-cocoa mb-1">
            {t("settings.prompts.stage1")}
          </div>
          <textarea
            className="w-full min-h-[5rem] bg-candy-cream border-[1.5px] border-candy-border rounded-xl p-2.5 text-[0.6875rem] text-candy-cocoa leading-relaxed resize-y outline-none focus:border-candy-orange transition-colors"
            value={stage1}
            onChange={(e) => setStage1(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs font-medium text-candy-cocoa mb-1">
            {t("settings.prompts.stage2")}
          </div>
          <textarea
            className="w-full min-h-[5rem] bg-candy-cream border-[1.5px] border-candy-border rounded-xl p-2.5 text-[0.6875rem] text-candy-cocoa leading-relaxed resize-y outline-none focus:border-candy-orange transition-colors"
            value={stage2}
            onChange={(e) => setStage2(e.target.value)}
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
            {t("settings.prompts.resetDefault")}
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
