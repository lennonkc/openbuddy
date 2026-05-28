import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileTree } from "./FileTree";
import { FilePreview } from "./FilePreview";

const DEFAULT_SPLIT = 28;
const MIN_SPLIT = 18;
const MAX_SPLIT = 55;

export function FileExplorer({ cwd }: { cwd: string }) {
  const { t } = useTranslation();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [splitPercent, setSplitPercent] = useState(DEFAULT_SPLIT);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const handleSelectFile = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      setSplitPercent(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, pct)));
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 overflow-hidden">
      <div
        className="shrink-0 overflow-hidden border-r border-candy-border/30"
        style={{ width: `${splitPercent}%` }}
      >
        <FileTree cwd={cwd} selectedPath={selectedPath} onSelectFile={handleSelectFile} />
      </div>

      <div
        onMouseDown={handleMouseDown}
        className="w-[3px] shrink-0 bg-candy-border/25 cursor-col-resize hover:bg-candy-orange/40 active:bg-candy-orange/60 transition-colors"
      />

      <div className="flex-1 min-w-0 overflow-hidden">
        {selectedPath ? (
          <FilePreview path={selectedPath} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 select-none">
            <span className="text-3xl opacity-40">📂</span>
            <span className="text-xs text-candy-caramel/60">{t("room.fileExplorer.emptyHint")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
