// src/components/chat/ChatWindowHeader.tsx
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  FaArrowLeft,
  FaCheck,
  FaEllipsisV,
  FaLock,
  FaTimes,
  FaUnlock,
  FaUserPlus,
  FaUsers,
} from 'react-icons/fa';
import type { MessagePermission } from '@/services/types/chat';
import { anchorMenu } from './chatHelpers';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  /** Ảnh / emoji đại diện hội thoại */
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  /** Chỉ hiện menu "..." khi có ít nhất 1 handler */
  isGroup?: boolean;
  canManage?: boolean;
  messagePermission?: MessagePermission;
  onShowMembers?: () => void;
  onAddMembers?: () => void;
  onUpdateName?: (newName: string) => void;
  onUpdatePermission?: (perm: MessagePermission) => void;
}

const iconBtn =
  'inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] ' +
  'border-0 bg-transparent text-white transition-colors hover:bg-white/20 active:bg-white/25';

const menuItem =
  'flex w-full items-center gap-2 rounded-[7px] border-0 bg-transparent px-2.5 py-2 ' +
  'text-left text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50';

const ChatWindowHeader = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  onClose,
  avatarUrl,
  avatarEmoji,
  isGroup = false,
  canManage = false,
  messagePermission = 'EVERYONE',
  onShowMembers,
  onAddMembers,
  onUpdateName,
  onUpdatePermission,
}: Props) => {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editingName) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [editingName]);

  // Đổi view/tiêu đề thì đóng menu + huỷ sửa tên
  const canRename = isGroup && canManage && Boolean(onUpdateName);
  const hasMenu = Boolean(onShowMembers || onAddMembers || onUpdatePermission);
  const isAdminsOnly = messagePermission === 'ADMIN_ONLY';
  const isReadOnly = messagePermission === 'READ_ONLY';

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== title) onUpdateName?.(trimmed);
    setEditingName(false);
  };

  const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
    if (menu) {
      setMenu(null);
      return;
    }
    setMenu(anchorMenu(e.currentTarget, 196, 232));
  };

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-1.5 bg-brand px-2 text-white">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {showBack && onBack && (
            <button type="button" onClick={onBack} className={iconBtn} title="Quay lại">
              <FaArrowLeft size={13} />
            </button>
          )}

          {(avatarUrl || avatarEmoji) && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/25 text-[15px]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                avatarEmoji
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  maxLength={255}
                  className="h-7 min-w-0 flex-1 rounded-[7px] border border-white/70 bg-white px-2 text-[12.5px] font-semibold text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className={iconBtn}
                  title="Lưu tên"
                >
                  <FaCheck size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className={iconBtn}
                  title="Huỷ"
                >
                  <FaTimes size={11} />
                </button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1.5 text-[13.5px] font-bold leading-[18px] ${
                  canRename ? 'cursor-pointer' : ''
                }`}
                onDoubleClick={() => {
                  if (!canRename) return;
                  setNameInput(title);
                  setEditingName(true);
                }}
                title={canRename ? 'Nháy đúp để đổi tên nhóm' : undefined}
              >
                <span className="truncate">{title}</span>
                {isAdminsOnly && (
                  <FaLock size={10} className="shrink-0 text-amber-300" title="Chỉ admin gửi" />
                )}
                {isReadOnly && (
                  <span className="shrink-0 rounded-full bg-white/25 px-1.5 text-[9px] font-bold leading-[14px]">
                    chỉ đọc
                  </span>
                )}
              </div>
            )}
            {subtitle && (
              <div className="truncate text-[11px] leading-[15px] text-white/80">{subtitle}</div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {hasMenu && (
            <button
              type="button"
              onClick={openMenu}
              className={iconBtn}
              title="Tuỳ chọn hội thoại"
            >
              <FaEllipsisV size={13} />
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className={iconBtn} title="Đóng">
              <FaTimes size={15} />
            </button>
          )}
        </div>
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-[1250]" onClick={() => setMenu(null)} />
          <div
            className="fixed z-[1300] min-w-[196px] rounded-xl border border-slate-100 bg-white p-1 shadow-[0_12px_28px_-10px_rgba(15,23,42,0.26),0_2px_6px_rgba(15,23,42,0.06)]"
            style={{ top: menu.top, left: menu.left }}
          >
            {onShowMembers && (
              <button
                type="button"
                onClick={() => {
                  setMenu(null);
                  onShowMembers();
                }}
                className={menuItem}
              >
                <FaUsers size={12} className="text-slate-400" />
                Quản lý thành viên
              </button>
            )}
            {onAddMembers && (
              <button
                type="button"
                onClick={() => {
                  setMenu(null);
                  onAddMembers();
                }}
                className={menuItem}
              >
                <FaUserPlus size={12} className="text-slate-400" />
                Thêm thành viên
              </button>
            )}
            {onUpdatePermission && isGroup && canManage && (
              <>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    onUpdatePermission(isAdminsOnly ? 'EVERYONE' : 'ADMIN_ONLY');
                  }}
                  className={menuItem}
                >
                  {isAdminsOnly ? (
                    <>
                      <FaUnlock size={12} className="text-emerald-500" />
                      Cho mọi người gửi tin
                    </>
                  ) : (
                    <>
                      <FaLock size={12} className="text-amber-500" />
                      Chỉ admin được gửi
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    onUpdatePermission(isReadOnly ? 'EVERYONE' : 'READ_ONLY');
                  }}
                  className={menuItem}
                >
                  <FaLock size={12} className="text-rose-500" />
                  {isReadOnly ? 'Mở lại quyền gửi tin' : 'Chuyển sang chỉ đọc'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default ChatWindowHeader;
