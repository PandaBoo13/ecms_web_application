import { useCallback, useRef, useState } from 'react';
import { aiAgentApi } from '@/services/api/aiAgent';
import type { AIMessage } from '@/services/types/aiAgent';

/**
 * Defense-in-depth: phòng trường hợp BE chưa fix thinking leak của Gemini.
 * Nếu BE đã fix triệt để, hàm này không gây hại.
 */
const LEAK_MARKERS = [
  'Okay, so',
  'Let me',
  'System Check',
  '**Lead Creation',
  "Let's go ahead",
  'I need to',
  'checks out',
];

function sanitize(text: string): string {
  const lower = text.toLowerCase();
  for (const m of LEAK_MARKERS) {
    if (lower.includes(m.toLowerCase())) {
      return 'Xin lỗi, trợ lý AI đang gặp sự cố. Yêu cầu của bạn CHƯA được xử lý. Vui lòng thử lại sau ít phút.';
    }
  }
  return text;
}

const MIN_INTERVAL_MS = 3000;

export function useAIAgent() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const lastSendRef = useRef<number>(0);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const now = Date.now();
      if (now - lastSendRef.current < MIN_INTERVAL_MS) return;
      lastSendRef.current = now;

      const userMsg: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const pendingId = crypto.randomUUID();
      const pendingMsg: AIMessage = {
        id: pendingId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        pending: true,
      };

      setMessages((p) => [...p, userMsg, pendingMsg]);
      setLoading(true);

      try {
        const reply = await aiAgentApi.chat(trimmed);
        const safe = sanitize(reply);
        setMessages((p) =>
          p.map((m) =>
            m.id === pendingId ? { ...m, content: safe, pending: false } : m
          )
        );
      } catch (err) {
        const e = err as { message?: string };
        setMessages((p) =>
          p.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  pending: false,
                  error: e?.message || 'Không thể kết nối trợ lý AI',
                }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, loading, send, clear };
}