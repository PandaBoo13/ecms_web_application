// src/components/chat/ChatMessageList.tsx
import { useEffect, useMemo, useRef } from 'react';
import { FaArrowUp, FaComments, FaSpinner } from 'react-icons/fa';
import MessageBubble from './MessageBubble';
import { dayKey, formatDayLabel } from './chatHelpers';
import type { MessageResponse, ParticipantResponse } from '@/services/types/chat';

interface Props {
  messages: MessageResponse[];
  currentUserId?: number;
  loading?: boolean;
  /** Còn tin nhắn cũ hơn để tải */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => Promise<void> | void;
  /** Hiện tên người gửi (chat nhóm) */
  showSender?: boolean;
  /** Cho phép xoá tin của người khác (MODERATOR+) */
  canModerate?: boolean;
  /** Cho phép sửa tin của mình (theo quyền gửi tin của hội thoại) */
  canEdit?: boolean;
  participants?: ParticipantResponse[];
  /** accountId → lastReadMessageId nhận qua WebSocket */
  readReceipts?: Record<number, number | null>;
  onReply?: (message: MessageResponse) => void;
  onEdit?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
}

const ChatMessageList = ({
  messages,
  currentUserId,
  loading = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  showSender = true,
  canModerate = false,
  canEdit = true,
  participants = [],
  readReceipts = {},
  onReply,
  onEdit,
  onDelete,
}: Props) => {
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  // Chỉ auto-scroll khi có tin nhắn mới ở cuối (không scroll khi prepend tin cũ)
  useEffect(() => {
    if (lastMessageId == null) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lastMessageId]);

  // Mốc "đã đọc" của từng thành viên khác
  const readMarks = useMemo(
    () =>
      participants
        .filter((p) => p.accountId !== currentUserId)
        .map((p) => {
          const wsMark = readReceipts[p.accountId];
          const mark = wsMark !== undefined ? wsMark : p.lastReadMessageId;
          return typeof mark === 'number' ? mark : 0;
        })
        .filter((mark) => mark > 0),
    [participants, readReceipts, currentUserId],
  );

  const countReaders = (messageId: number) =>
    readMarks.reduce((count, mark) => (mark >= messageId ? count + 1 : count), 0);

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return;
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    await onLoadMore();
    // Giữ nguyên vị trí đọc sau khi chèn tin cũ lên đầu
    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
    });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 text-brand">
        <FaSpinner className="animate-spin" size={22} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 bg-slate-50 px-6 text-center">
        <FaComments className="mb-1 text-[26px] text-slate-300" />
        <div className="text-[12.5px] font-semibold text-slate-500">Chưa có tin nhắn nào</div>
        <div className="text-[11px] text-slate-400">Hãy gửi tin nhắn đầu tiên</div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3"
    >
      {(hasMore || loadingMore) && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-500 transition-colors hover:border-brand hover:text-brand-700 disabled:opacity-65"        >
          {loadingMore ? (
            <FaSpinner className="animate-spin" size={9} />
          ) : (
            <FaArrowUp size={9} />
          )}
          Tải tin nhắn cũ hơn
        </button>
      )}

      {messages.map((m, index) => {
        const prev = index > 0 ? messages[index - 1] : null;
        const showDay = dayKey(prev?.createdAt) !== dayKey(m.createdAt);
        const isMine = m.senderId === currentUserId;

        return (
          <div key={m.id} className="flex flex-col gap-2">
            {showDay && (
              <div className="self-center rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-semibold leading-[15px] text-slate-500">
                {formatDayLabel(m.createdAt)}
              </div>
            )}
            <MessageBubble
              message={m}
              isMine={isMine}
              showSender={showSender}
              canEdit={isMine && canEdit && !m.isDeleted}
              canDelete={!m.isDeleted && (isMine || canModerate)}
              readBy={isMine ? countReaders(m.id) : 0}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default ChatMessageList;
