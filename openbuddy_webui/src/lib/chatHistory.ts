import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, Event } from "./useEventStream";

interface HistoryMessage {
  id: number;
  role: "user" | "assistant";
  raw: string;
  display: string;
  modified_files?: string[] | null;
  created_at: string;
}

const base = "";

async function fetchMessages(
  limit = 200,
  beforeId?: number,
): Promise<HistoryMessage[]> {
  let url = `${base}/api/messages?limit=${limit}`;
  if (beforeId != null) url += `&before_id=${beforeId}`;
  const r = await fetch(url);
  if (!r.ok) return [];
  return r.json();
}

function historyToChat(m: HistoryMessage): ChatMessage {
  return {
    id: `hist-${m.id}`,
    dbId: m.id,
    role: m.role,
    raw: m.raw,
    display: m.display,
    modifiedFiles: m.modified_files ?? undefined,
    timestamp: new Date(m.created_at).getTime(),
  };
}

export function useChatHistory(events: Event[]) {
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMessages()
      .then((msgs) => {
        if (!cancelled) {
          setHistoryMessages(msgs.map(historyToChat));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const messages: ChatMessage[] = useMemo(() => {
    const seenIds = new Set(
      historyMessages.map((m) => m.dbId).filter((id): id is number => id != null),
    );
    const live: ChatMessage[] = [];
    let idx = historyMessages.length;
    for (const e of events) {
      if (e.type !== "user_message" && e.type !== "agent_message") continue;
      const dbId = e.message_id as number | undefined;
      if (dbId && seenIds.has(dbId)) continue;
      if (dbId) seenIds.add(dbId);
      live.push({
        id: `live-${idx++}`,
        dbId,
        role: e.type === "user_message" ? "user" : "assistant",
        raw: e.raw as string,
        display: (e.type === "user_message" ? e.cleaned : e.spoken) as string,
        modifiedFiles: (e.modified_files as string[] | undefined) ?? undefined,
        timestamp: (e._receivedAt as number) ?? 0,
      });
    }
    return [...historyMessages, ...live];
  }, [historyMessages, events]);

  return { messages, loading };
}
