// src/components/chat/chatHelpers.ts
import type { ConversationResponse } from '@/services/types/chat';

/** "vừa xong" / "5p" / "3g" / "12/03" */
export const formatRelative = (iso?: string | null) => {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}g`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export const formatClock = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Khoá theo ngày (dùng để chèn dải ngày) */
export const dayKey = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** "Hôm nay" / "Hôm qua" / "12/03/2026" */
export const formatDayLabel = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getConvIcon = (type: string) => {
  if (type === 'COURSE') return '📚';
  if (type === 'GROUP') return '👥';
  return '👤';
};

/** BE đã tự tính name cho PRIVATE (tên người còn lại) */
export const getConversationTitle = (
  conversation: ConversationResponse,
  currentUserId?: number,
) => {
  if (conversation.name) return conversation.name;
  if (conversation.conversationType === 'PRIVATE') {
    const other = (conversation.participants || []).find(
      (p) => p.accountId !== currentUserId,
    );
    if (other) return other.fullName || other.username || 'Trò chuyện';
  }
  return `Hội thoại #${conversation.id}`;
};

/** Avatar của người còn lại trong chat riêng (nhóm dùng emoji) */
export const getConversationAvatar = (
  conversation: ConversationResponse,
  currentUserId?: number,
) => {
  if (conversation.conversationType !== 'PRIVATE') return null;
  const other = (conversation.participants || []).find((p) => p.accountId !== currentUserId);
  return other?.avatarUrl || null;
};

/**
 * Toạ độ cho dropdown dạng `position: fixed` — tránh bị cắt bởi vùng
 * `overflow-y-auto` (danh sách hội thoại / thành viên) và luôn nằm trong viewport.
 */
export const anchorMenu = (el: HTMLElement, width: number, height = 260) => {
  const rect = el.getBoundingClientRect();
  const top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - height - 8));
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
  return { top, left };
};
