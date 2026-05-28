import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon, fileIconName } from "@/lib/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/useEventStream";
import { categorize, fileBasename } from "@/lib/fileCategory";
import { FilePreview } from "@/components/room/FilePreview";

function usePreviewableFiles(files?: string[]): string[] {
  return useMemo(() => {
    if (!files?.length) return [];
    return files.filter((f) => categorize(fileBasename(f)) !== "unknown");
  }, [files]);
}

function ChatFilePreview({ path }: { path: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const filename = fileBasename(path);

  return (
    <div className="rounded-xl border border-candy-green/25 bg-gradient-to-br from-[#E8F5E9]/60 via-white/70 to-candy-cream/40 backdrop-blur-sm overflow-hidden shadow-sm animate-pop-in">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-candy-green/5 transition-colors group"
      >
        <MappedIcon name={fileIconName(filename, false)} width={14} className="shrink-0" />
        <span className="text-xs font-semibold text-candy-cocoa truncate">{filename}</span>
        <span className="text-[0.5625rem] text-candy-caramel/40 truncate ml-auto mr-2 hidden sm:block">{path}</span>
        <MappedIcon
          name={collapsed ? "collapse" : "expand"}
          width={10}
          className="shrink-0 text-candy-caramel/50 group-hover:text-candy-caramel transition-colors"
        />
      </button>
      {!collapsed && (
        <div className="h-[80vh] overflow-auto border-t border-candy-green/15">
          <FilePreview path={path} />
        </div>
      )}
    </div>
  );
}

export function AgentMessage({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasDiff = message.raw !== message.display;
  const previewFiles = usePreviewableFiles(message.modifiedFiles);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 max-w-[75%]">
        <img src="/openbuddylogo.svg" alt="OpenBuddy" className="w-9 h-9 xl:w-11 xl:h-11 shrink-0 mt-0.5" />
        <div>
          <div className="bg-[#E8F5E9]/90 backdrop-blur-sm border border-candy-green/30 rounded-xl rounded-bl-sm px-3.5 py-2.5 xl:px-4 xl:py-3 text-[0.8125rem] animate-pop-in">
            <div className="prose prose-sm max-w-none text-candy-cocoa prose-p:my-2 prose-headings:mt-4 prose-headings:mb-1.5 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-hr:my-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.raw}</ReactMarkdown>
            </div>
            {hasDiff && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1.5 flex items-center gap-1 text-[0.6875rem] text-candy-caramel/60 hover:text-candy-caramel"
              >
                {expanded ? <MappedIcon name="expand" width={10} /> : <MappedIcon name="collapse" width={10} />}
                {t("chat.viewSpokenText")}
              </button>
            )}
            {expanded && (
              <div className="mt-1.5 pt-1.5 border-t border-candy-green/20 text-[0.6875rem] text-candy-caramel/60 whitespace-pre-wrap">
                {message.display}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewFiles.length > 0 && (
        <div className="ml-11 xl:ml-[3.25rem] flex flex-col gap-2">
          {previewFiles.map((filePath) => (
            <ChatFilePreview key={filePath} path={filePath} />
          ))}
        </div>
      )}
    </div>
  );
}
