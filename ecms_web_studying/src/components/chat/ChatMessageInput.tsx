// src/components/chat/ChatMessageInput.tsx
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { FaLock, FaPaperPlane, FaReply, FaSpinner, FaTimes } from 'react-icons/fa';
import type { MessageResponse } from '@/services/types/chat';

interface Props {
  onSend: (content: string) => void | Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  replyingTo?: MessageResponse | null;
  onCancelReply?: () => void;
}

const MAX_LENGTH = 10000;

const ChatMessageInput = ({
  onSend,
  onTyping,
  disabled = false,
  disabledReason,
  replyingTo,
  onCancelReply,
}: Props) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize (1 → 4 dòng)
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [text]);

  const submit = async () => {
    if (disabled || sending) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
      onCancelReply?.();
    } catch {
      // Lỗi đã được toast ở tầng useChat — giữ nội dung để gửi lại
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    // Không gửi khi đang gõ IME (tiếng Việt/Trung/Nhật)
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    void submit();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex shrink-0 flex-col border-t border-slate-200 bg-white px-3 pb-2.5 pt-2"
    >
      {replyingTo && (
        <div className="mb-1.5 flex items-start gap-1.5 rounded-[7px] border-l-2 border-brand bg-slate-50 px-2 py-1.5">
          <FaReply size={10} className="mt-0.5 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold leading-[13px] text-brand-700">
              Trả lời {replyingTo.senderName || 'Ai đó'}
            </div>
            <div className="truncate text-[11px] leading-[15px] text-slate-500">
              {replyingTo.content || `[${replyingTo.messageType}]`}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 border-0 bg-transparent p-0.5 text-slate-400 transition-colors hover:text-rose-500"
            title="Huỷ trả lời"
          >
            <FaTimes size={10} />
          </button>
        </div>
      )}

      {disabled && disabledReason && (
        <div className="mb-1.5 flex items-start gap-1.5 rounded-[7px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-[15px] text-amber-700">
          <FaLock size={10} className="mt-0.5 shrink-0" />
          <span>{disabledReason}</span>
        </div>
      )}

      {text.length > MAX_LENGTH - 1000 && (
        <div className="mb-1 text-right text-[10px] text-amber-600">
          {text.length}/{MAX_LENGTH}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={areaRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          maxLength={MAX_LENGTH}
          placeholder={
            disabled ? 'Không thể gửi tin nhắn' : 'Nhập tin nhắn... (Shift + Enter để xuống dòng)'
          }
          className="min-h-9 max-h-24 flex-1 resize-none rounded-xl border border-slate-200 px-2.5 py-2 text-[13px] leading-[18px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-[3px] focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={disabled || sending || !text.trim()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45"
          title="Gửi tin nhắn"
        >
          {sending ? <FaSpinner className="animate-spin" size={12} /> : <FaPaperPlane size={12} />}
        </button>
      </div>
    </form>
  );
};

export default ChatMessageInput;
