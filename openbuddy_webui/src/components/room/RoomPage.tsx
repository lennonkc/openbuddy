import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getConfig, setCwd, pickDirectory } from "@/lib/api";
import { EmptyState } from "./EmptyState";
import { ResidenceCard } from "./ResidenceCard";
import { FileExplorer } from "./FileExplorer";

export function RoomPage() {
  const { t } = useTranslation();
  const [cwd, setCwdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const pickerAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    getConfig()
      .then((c) => setCwdState(c.cwd || null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => {
    pickerAbort.current?.abort();
  }, []);

  const handlePickDirectory = useCallback(async () => {
    if (picking) return;
    setPicking(true);
    const controller = new AbortController();
    pickerAbort.current = controller;
    try {
      const result = await pickDirectory(cwd || undefined, controller.signal);
      if (!result.cancelled && result.path) {
        await setCwd(result.path);
        setCwdState(result.path);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("pickDirectory failed:", err);
    } finally {
      setPicking(false);
      pickerAbort.current = null;
    }
  }, [cwd, picking]);

  const handleChangeCwd = useCallback(async (path: string) => {
    try {
      await setCwd(path);
      setCwdState(path);
    } catch (err) {
      console.error("setCwd failed:", err);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-candy-caramel">
        {t("common.loading")}
      </div>
    );
  }

  if (!cwd) {
    return <EmptyState onPickDirectory={handlePickDirectory} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-3 xl:p-4 2xl:p-5">
      <div className="flex flex-col flex-1 min-h-0 glass-card overflow-hidden">
        <ResidenceCard
          cwd={cwd}
          onPickDirectory={handlePickDirectory}
          onChangeCwd={handleChangeCwd}
          picking={picking}
        />
        <FileExplorer cwd={cwd} />
      </div>
    </div>
  );
}
