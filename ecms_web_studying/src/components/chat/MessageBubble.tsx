// src/components/chat/MessageBubble.tsx
import { useState } from 'react';
import {
  FaCheck,
  FaCheckDouble,
  FaDownload,
  FaEdit,
  FaFile,
  FaReply,
  FaTrash,
} from 'react-icons/fa';
import type { MessageResponse } from '@/services/types/chat';
import { formatClock } from './chatHelpers';

interface Props {
  message: MessageResponse;
  isMine: boolean;
  showSender?: boolean;
  /** Cho phép sửa (chỉ tin của mình, chưa bị xoá, còn quyền gửi) */
  canEdit?: boolean;
  /** Cho phép xoá (tin của mình, hoặc MODERATOR+ xoá tin người khác) */
  canDelete?: boolean;
  /** Số người khác đã đọc tới tin này */
  readBy?: number;
  onReply?: (message: MessageResponse) => void;
  onEdit?: (id: number, content: string) => void;
  onDelete?: (id: number) => void;
}

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageBubble = ({
  message,
  isMine,
  showSender = true,
  canEdit = false,
  canDelete = false,
  readBy = 0,
  onReply,
  onEdit,
  onDelete,
}: Props) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');

  if (message.messageType === 'SYSTEM') {
    return (
      <div className="flex w-full justify-center">
        <div className="rounded-full bg-slate-200/70 px-3 py-1">
          <div className="text-center text-[11px] italic text-slate-500">{message.content}</div>
        </div>
      </div>
    );
  }

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== (message.content || '')) {
      onEdit?.(message.id, trimmed);
    }
    setIsEditing(false);
  };

  const bubbleTone = isMine
    ? 'bg-brand text-white rounded-2xl rounded-br-[5px]'
    : 'border border-slate-200/80 bg-white text-slate-700 rounded-2xl rounded-bl-[5px]';

  const renderContent = () => {
    if (message.isDeleted) {
      return <em className="text-[11.5px] opacity-70">Tin nhắn đã bị xoá</em>;
    }

    switch (message.messageType) {
      case 'IMAGE':
        return (
          <div className="max-w-[200px]">
            {message.fileUrl && (
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Ảnh'}
                className="block w-full cursor-pointer rounded-[9px] hover:opacity-95"
                onClick={() => window.open(message.fileUrl!, '_blank')}
              />
            )}
            {message.content && <div className="mt-1 text-[13px]">{message.content}</div>}
          </div>
        );
      case 'FILE':
        return (
          <a
            href={message.fileUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex min-w-[168px] items-center gap-2 rounded-[9px] p-1.5 ${
              isMine ? 'bg-white/20' : 'bg-slate-50'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${
                isMine ? 'bg-white/25 text-white' : 'bg-white text-brand-700'
              }`}
            >
              <FaFile size={13} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-semibold leading-4">
                {message.fileName || 'Tài liệu'}
              </span>
              <span className="block text-[10px] leading-[13px] opacity-75">
                {formatFileSize(message.fileSize)}
              </span>
            </span>
            <FaDownload size={11} className="shrink-0 opacity-60" />
          </a>
        );
      case 'VIDEO':
        return (
          <div className="max-w-[200px]">
            <video src={message.fileUrl || undefined} controls className="w-full rounded-[9px]">
              Trình duyệt không hỗ trợ video
            </video>
            {message.content && <div className="mt-1 text-[13px]">{message.content}</div>}
          </div>
        );
      case 'AUDIO':
        return (
          <div className="min-w-[180px]">
            <audio src={message.fileUrl || undefined} controls className="w-full" />
            {message.content && <div className="mt-1 text-[13px]">{message.content}</div>}
          </div>
        );
      default:
        return <div className="whitespace-pre-wrap break-words">{message.content}</div>;
    }
  };

  const actionsVisible = showActions && !isEditing && !message.isDeleted;
  const hasActions = Boolean(onReply || (canEdit && onEdit) || (canDelete && onDelete));

  return (
    <div
      className={`group/msg flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative min-w-0 max-w-[72%]">
        {!isMine && showSender && (
          <div className="mb-0.5 ml-2 flex items-center gap-1 text-[10.5px] font-semibold leading-[13px] text-slate-400">
            <span className="truncate">{message.senderName || `User #${message.senderId}`}</span>
            {message.isEdited && (
              <span className="shrink-0 text-[9.5px] font-normal text-slate-300">(đã sửa)</span>
            )}
          </div>
        )}

        <div className={`px-3 py-[7px] text-[13px] leading-[1.45] ${bubbleTone}`}>
          {message.replyToMessageId && (
            <span
              className={`mb-1 block rounded-[5px] border-l-2 px-2 py-0.5 text-[11px] leading-[15px] ${
                isMine
                  ? 'border-white/50 bg-white/15 text-white/85'
                  : 'border-brand bg-slate-50 text-slate-500'
              }`}
            >
              <b className="block text-[10px] font-bold">
                {message.replyToSenderName || 'Ai đó'}
              </b>
              <em className="block truncate not-italic">
                {message.replyToContent || '(tin nhắn không còn)'}
              </em>
            </span>
          )}

          {isEditing ? (
            <div className="min-w-[160px]">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                maxLength={10000}
                className="w-full border-none bg-transparent text-[13px] text-inherit outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <div className="mt-1 flex justify-end gap-2.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="cursor-pointer border-0 bg-transparent opacity-85 hover:underline hover:opacity-100"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="cursor-pointer border-0 bg-transparent opacity-85 hover:underline hover:opacity-100"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>

        <div
          className={`mt-0.5 flex items-center gap-1 text-[10px] leading-3 text-slate-400 ${
            isMine ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{formatClock(message.createdAt)}</span>
          {isMine && message.isEdited && <span className="text-slate-300">(đã sửa)</span>}
          {isMine &&
            (readBy > 0 ? (
              <span
                className="inline-flex items-center gap-0.5 font-semibold text-brand-700"
                title={`${readBy} người đã xem`}
              >
                <FaCheckDouble size={9} /> Đã xem
              </span>
            ) : (
              <FaCheck size={9} className="text-slate-300" title="Đã gửi" />
            ))}
        </div>

        {actionsVisible && hasActions && (
          <div
            className={`pointer-events-none absolute top-0 z-[5] flex gap-px rounded-[9px] border border-slate-200 bg-white p-0.5 opacity-0 shadow-[0_8px_18px_-8px_rgba(15,23,42,0.3)] transition-opacity group-hover/msg:pointer-events-auto group-hover/msg:opacity-100 ${
              isMine ? '-left-[78px]' : '-right-[78px]'
            }`}
          >
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-50 hover:text-brand-700"
                title="Trả lời"
              >
                <FaReply size={10} />
              </button>
            )}
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditContent(message.content || '');
                  setIsEditing(true);
                }}
                className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600"
                title="Sửa"
              >
                <FaEdit size={10} />
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(message.id)}
                className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md border-0 bg-transparent text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                title="Xoá"
              >
                <FaTrash size={10} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
