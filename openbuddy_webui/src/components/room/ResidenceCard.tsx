import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import { suggestPaths } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResidenceCardProps {
  cwd: string;
  onPickDirectory: () => void;
  onChangeCwd: (path: string) => void;
  picking?: boolean;
}

export function ResidenceCard({ cwd, onPickDirectory, onChangeCwd, picking }: ResidenceCardProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => () => clearTimeout(suggestTimer.current), []);

  const fetchSuggestions = useCallback((value: string) => {
    clearTimeout(suggestTimer.current);
    if (!value) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      suggestPaths(value).then(setSuggestions).catch(() => setSuggestions([]));
    }, 200);
  }, []);

  function startEdit() {
    setDraft(cwd);
    setEditing(true);
    setSuggestions([]);
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    fetchSuggestions(value);
  }

  function confirmEdit() {
    if (draft.trim() && draft.trim() !== cwd) {
      onChangeCwd(draft.trim());
    }
    setEditing(false);
    setSuggestions([]);
  }

  function cancelEdit() {
    setDraft("");
    setEditing(false);
    setSuggestions([]);
  }

  function applySuggestion(s: string) {
    const next = (draft.endsWith("/") ? draft : draft.replace(/[^/]+$/, "")) + s + "/";
    setDraft(next);
    fetchSuggestions(next);
    inputRef.current?.focus();
  }

  return (
    <div className="shrink-0 border-b border-candy-border/60">
      <div className="px-5 py-3 xl:px-6 xl:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl xl:text-2xl candy-title leading-none">{t("room.residence.title")}</h1>
          <span className="text-[0.6875rem] text-candy-cocoa/50 font-semibold hidden sm:inline">
            {t("room.residence.subtitle")}
          </span>
        </div>
        <button
          onClick={onPickDirectory}
          disabled={picking}
          className="shrink-0 text-xs text-candy-orange hover:text-candy-pink font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {picking ? (
            <>
              <MappedIcon name="loading" width={10} className="animate-spin" />
              <span>{t("room.residence.selecting")}</span>
            </>
          ) : (
            t("room.residence.changeLocation")
          )}
        </button>
      </div>

      <div className="px-5 pb-3 xl:px-6">
        {editing ? (
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                className="h-7 text-xs font-mono bg-white/60 border-candy-border text-candy-cocoa flex-1"
                placeholder={t("room.residence.pathPlaceholder")}
                spellCheck={false}
                autoComplete="off"
              />
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={confirmEdit}
                className="text-candy-green hover:text-candy-green/80 hover:bg-candy-green/10 shrink-0"
                aria-label={t("common.confirm")}
              >
                <MappedIcon name="check" width={12} />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={cancelEdit}
                className="text-candy-caramel/60 hover:text-candy-cocoa shrink-0"
                aria-label={t("common.cancel")}
              >
                <MappedIcon name="cross" width={12} />
              </Button>
            </div>

            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-0.5 z-10 bg-white border border-candy-border rounded-lg shadow-candy-hover overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-xs font-mono text-candy-caramel hover:bg-candy-cream-dark hover:text-candy-cocoa transition-colors"
                    onClick={() => applySuggestion(s)}
                  >
                    {s}/
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group">
            <span className="text-xs font-mono text-candy-caramel truncate" title={cwd}>
              {cwd}
            </span>
            <button
              onClick={startEdit}
              className="opacity-0 group-hover:opacity-100 text-candy-caramel/40 hover:text-candy-cocoa transition-all p-0.5"
              aria-label={t("room.residence.editPath")}
            >
              <MappedIcon name="pencil" width={10} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
