import { createContext, useContext, useEffect, useState } from "react";

export type Event = Record<string, unknown> & { type: string; _receivedAt?: number };

export type ChatMessage = {
  id: string;
  dbId?: number;
  role: "user" | "assistant";
  raw: string;
  display: string;
  modifiedFiles?: string[];
  timestamp: number;
};

const EventStreamCtx = createContext<Event[]>([]);

export const EventStreamProvider = EventStreamCtx.Provider;

export function useEventStreamConnection(): Event[] {
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => {
    let ws: WebSocket | null = null;
    let backoff = 1000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws/webui`);
      ws.onopen = () => { backoff = 1000; };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          setEvents((prev) => [...prev.slice(-499), { ...msg, _receivedAt: Date.now() }]);
        } catch { /* ignore binary */ }
      };
      ws.onerror = () => { ws?.close(); };
      ws.onclose = () => {
        if (unmounted) return;
        timer = setTimeout(() => { connect(); }, backoff);
        backoff = Math.min(backoff * 2, 8000);
      };
    }

    connect();
    return () => {
      unmounted = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, []);
  return events;
}

export function useEventStream(): Event[] {
  return useContext(EventStreamCtx);
}

export function useAgentState(events: Event[]): string {
  const last = events.findLast((e) => e.type === "state");
  return (last as Event & { state?: string })?.state ?? "idle";
}

export function useDeviceConnected(events: Event[]): boolean {
  const last = events.findLast((e) => e.type === "state");
  return last !== undefined && (last as Event & { state?: string }).state !== "disconnected";
}
