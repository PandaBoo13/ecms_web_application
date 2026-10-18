// src/components/chat/ConversationList.tsx
import { useState } from 'react';
import type { MouseEvent } from 'react';
import {
  FaArchive,
  FaBellSlash,
  FaComments,
  FaEllipsisV,
  FaSearch,
  FaSpinner,
  FaThumbtack,
  FaUndo,
} from 'react-icons/fa';
import type { ConversationResponse } from '@/services/types/chat';
import {
  anchorMenu,
  formatRelative,
  getConvIcon,
  getConversationAvatar,
  getConversationTitle,
} from './chatHelpers';

interface Props {
  conversations: ConversationResponse[];
  currentUserId?: number;
  loading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  emptyTitle: string;
  emptyHint?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onOpen: (conversation: ConversationResponse) => void;
  onPin: (conversation: ConversationResponse) => void;
  onToggleMute: (conversation: ConversationResponse) => void;
  onToggleArchive: (conversation: ConversationResponse) => void;
}

const menuItem =
  'flex w-full items-center gap-2 rounded-[7px] border-0 bg-transparent px-2.5 py-2 text-left ' +
  'text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50';

const ConversationList = ({
  conversations,
  currentUserId,
  loading,
  searchTerm,
  onSearchChange,
  emptyTitle,
  emptyHint,
  emptyActionLabel,
  onEmptyAction,
  onOpen,
  onPin,
  onToggleMute,
  onToggleArchive,
}: Props) => {
  const [menu, setMenu] = useState<{
    id: number;
    top: number;
    left: number;
  } | null>(null);

  const openMenu = (e: MouseEvent<HTMLButtonElement>, id: number) => {
    e.stopPropagation();
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    setMenu({ id, ...anchorMenu(e.currentTarget, 182, 148) });
  };

  const current = conversations.find((c) => c.id === menu?.id) ?? null;

  return (
    <>
      <div className="relative shrink-0 px-3 py-2">
        <FaSearch
          size={11}
          className="pointer-events-none absolute left-[22px] top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm kiếm hội thoại..."
          className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100"
        onScroll={() => setMenu(null)}
      >
        {loading && conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-brand">
            <FaSpinner className="animate-spin" size={22} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <FaComments className="mb-1 text-[26px] text-slate-300" />
            <div className="text-[12.5px] font-semibold text-slate-500">{emptyTitle}</div>
            {emptyHint && <div className="text-[11px] leading-4 text-slate-400">{emptyHint}</div>}
            {emptyActionLabel && onEmptyAction && (
              <button
                type="button"
                onClick={onEmptyAction}
                className="mt-1.5 border-0 bg-transparent text-[11.5px] font-bold text-brand-700 hover:underline"
              >
                {emptyActionLabel}
              </button>
            )}
          </div>
        ) : (
          conversations.map((conv) => {
            const unread = conv.unreadCount || 0;
            const avatar = getConversationAvatar(conv, currentUserId);
            return (
              <div
                key={conv.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(conv)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(conv);
                  }
                }}
                className={`group relative flex min-h-16 w-full cursor-pointer items-center gap-2.5 border-b border-slate-100 px-3 py-2 text-left transition-colors ${
                  unread > 0 ? 'bg-brand/[0.045] hover:bg-brand/10' : 'hover:bg-slate-50'
                } ${menu?.id === conv.id ? 'is-menu-open' : ''}`}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 text-base font-bold text-brand">
                  {avatar ? (
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getConvIcon(conv.conversationType)
                  )}
                  {conv.isPinned && (
                    <span className="absolute -bottom-px -right-px text-[9px] leading-none">
                      📌
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold leading-[18px] text-slate-800">
                      {getConversationTitle(conv, currentUserId)}
                    </span>
                    {conv.isMutedByUser && (
                      <span className="shrink-0 text-[10px] leading-none">🔕</span>
                    )}
                    {conv.conversationType === 'GROUP' && (
                      <span className="shrink-0 text-[10.5px] font-medium text-slate-400">
                        ({conv.participants?.length ?? 0})
                      </span>
                    )}
                  </div>
                  <div
                    className={`mt-0.5 truncate text-[11.5px] leading-4 ${
                      unread > 0 ? 'font-semibold text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {conv.lastMessagePreview || 'Chưa có tin nhắn'}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="whitespace-nowrap text-[10px] leading-none text-slate-400 transition-opacity group-hover:opacity-0">
                    {formatRelative(conv.lastMessageAt)}
                  </span>
                  {unread > 0 && (
                    <span className="h-[18px] min-w-[18px] rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold leading-[18px] text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => openMenu(e, conv.id)}
                  className={`absolute right-2 top-1.5 inline-flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 shadow-sm transition-opacity hover:text-slate-800 focus-visible:opacity-100 ${
                    menu?.id === conv.id
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Tuỳ chọn hội thoại"
                >
                  <FaEllipsisV size={10} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {menu && current && (
        <>
          <div className="fixed inset-0 z-[1250]" onClick={() => setMenu(null)} />
          <div
            className="fixed z-[1300] min-w-[182px] rounded-xl border border-slate-100 bg-white p-1 shadow-[0_12px_28px_-10px_rgba(15,23,42,0.26),0_2px_6px_rgba(15,23,42,0.06)]"
            style={{ top: menu.top, left: menu.left }}
          >
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                onPin(current);
              }}
              className={menuItem}
            >
              <FaThumbtack size={10} className="text-amber-500" />
              {current.isPinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                onToggleMute(current);
              }}
              className={menuItem}
            >
              <FaBellSlash size={10} className="text-slate-400" />
              {current.isMutedByUser ? 'Bật thông báo' : 'Tắt thông báo'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                onToggleArchive(current);
              }}
              className={menuItem}
            >
              {current.isArchived ? (
                <>
                  <FaUndo size={10} className="text-slate-400" /> Bỏ lưu trữ
                </>
              ) : (
                <>
                  <FaArchive size={10} className="text-slate-400" /> Lưu trữ hội thoại
                </>
              )}
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default ConversationList;
