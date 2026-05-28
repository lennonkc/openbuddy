import { useMemo } from "react";
import {
  useExternalStoreRuntime,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { ChatMessage } from "@/lib/useEventStream";

export function useChatRuntime(messages: ChatMessage[], isRunning: boolean) {
  const convertMessage = useMemo(
    () =>
      (msg: ChatMessage): ThreadMessageLike => ({
        role: msg.role,
        content: [{ type: "text", text: msg.display }],
        id: msg.id,
        createdAt: new Date(msg.timestamp),
      }),
    [],
  );

  return useExternalStoreRuntime({
    messages,
    convertMessage,
    isRunning,
    onNew: async () => {
      // Plan 2: read-only, no user input from web
    },
  });
}
