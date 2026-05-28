import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useEventStream,
  useAgentState,
  useDeviceConnected,
} from "@/lib/useEventStream";
import { useChatHistory } from "@/lib/chatHistory";
import { approveAuth } from "@/lib/api";
import { useChatRuntime } from "./ChatRuntime";
import { UserMessage } from "./UserMessage";
import { AgentMessage } from "./AgentMessage";
import type { ChatMessage } from "@/lib/useEventStream";

const STATUS_KEYS: Record<string, string> = {
  listening: "chat.status.listening",
  thinking: "chat.status.thinking",
  speaking: "chat.status.speaking",
};

function statusLabel(connected: boolean, agentState: string, t: (key: string) => string) {
  if (!connected) return t("chat.status.disconnected");
  return STATUS_KEYS[agentState] ? t(STATUS_KEYS[agentState]) : t("chat.status.idle");
}

function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 p-4 xl:p-6 overflow-y-auto flex flex-col gap-3 xl:gap-4">
      {messages.map((msg) =>
        msg.role === "user" ? (
          <UserMessage key={msg.id} message={msg} />
        ) : (
          <AgentMessage key={msg.id} message={msg} />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}

type AuthRequest = { request_id: string; tool_name: string; title: string };

function useAuthRequest(events: import("@/lib/useEventStream").Event[]): AuthRequest | null {
  return useMemo(() => {
    const lastAuth = events.findLast((e) => e.type === "authorization_request");
    if (!lastAuth) return null;
    const afterAuth = events.filter(
      (e) => e._receivedAt! > lastAuth._receivedAt! && e.type === "state",
    );
    if (afterAuth.length > 0) return null;
    return lastAuth as unknown as AuthRequest;
  }, [events]);
}

function AuthBanner({ req }: { req: AuthRequest }) {
  const { t } = useTranslation();
  return (
    <div className="mx-4 mt-3 xl:mx-6 animate-pop-in">
      <div className="glass-card px-4 py-3 flex items-center gap-3 border-candy-yellow/50 bg-gradient-to-r from-candy-yellow/15 via-white/80 to-candy-pink/10">
        <span className="text-2xl shrink-0 animate-bounce">🐾</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-candy-cocoa">{t("chat.auth.title")}</p>
          <p className="text-xs text-candy-caramel/70 mt-0.5">{t("chat.auth.hint")}</p>
          <p className="text-[11px] text-candy-caramel/50 mt-0.5 truncate">
            {t("chat.auth.tool", { name: req.tool_name })}
          </p>
        </div>
        <button
          onClick={() => approveAuth(req.request_id)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-candy-yellow/80 text-candy-cocoa hover:bg-candy-yellow transition-colors btn-jelly"
        >
          {t("chat.auth.webApprove")}
        </button>
      </div>
    </div>
  );
}

export function ChatPage() {
  const { t } = useTranslation();
  const events = useEventStream();
  const { messages } = useChatHistory(events);
  const agentState = useAgentState(events);
  const connected = useDeviceConnected(events);
  const isRunning = agentState === "thinking" || agentState === "speaking";
  const runtime = useChatRuntime(messages, isRunning);
  const authReq = useAuthRequest(events);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full">
        <div className="px-4 py-2.5 xl:px-6 xl:py-3 border-b border-candy-border/60 bg-gradient-to-r from-candy-yellow/10 via-white/60 to-candy-pink/10 flex items-center gap-3">
          <h1 className="text-lg xl:text-xl candy-title leading-none">{t("chat.header")}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                connected
                  ? agentState === "listening" || agentState === "thinking" || agentState === "speaking"
                    ? "bg-candy-yellow animate-pulse"
                    : "bg-candy-green"
                  : "bg-candy-caramel/30"
              }`}
            />
            <span className="text-xs text-candy-caramel/80">{statusLabel(connected, agentState, t)}</span>
          </div>
        </div>
        {authReq && <AuthBanner req={authReq} />}
        <ChatMessages messages={messages} />
      </div>
    </AssistantRuntimeProvider>
  );
}
