import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import type { ChatMessage } from "@/lib/useEventStream";

export function UserMessage({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasOriginal = message.raw !== message.display;

  return (
    <div className="flex gap-2 max-w-[75%] ml-auto flex-row-reverse">
      <MappedIcon name="user-avatar" className="w-9 h-9 xl:w-11 xl:h-11 shrink-0 mt-0.5" />
      <div>
        <div className="bg-candy-blue/20 border border-candy-blue/30 text-candy-cocoa rounded-xl rounded-br-sm px-3.5 py-2.5 xl:px-4 xl:py-3 text-[0.8125rem] animate-pop-in">
          {message.display}
          {hasOriginal && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 flex items-center gap-1 text-[0.6875rem] text-candy-caramel/70 hover:text-candy-cocoa"
            >
              {expanded ? <MappedIcon name="expand" width={10} /> : <MappedIcon name="collapse" width={10} />}
              {t("chat.viewSttOriginal")}
            </button>
          )}
          {expanded && (
            <div className="mt-1.5 pt-1.5 border-t border-candy-blue/20 text-[0.6875rem] text-candy-caramel">
              {message.raw}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
