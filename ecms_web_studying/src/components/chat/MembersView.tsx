// src/components/chat/MembersView.tsx
import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  FaArrowUp,
  FaBan,
  FaCheck,
  FaComments,
  FaCrown,
  FaEllipsisV,
  FaMicrophoneSlash,
  FaSearch,
  FaTrash,
  FaUserMinus,
  FaUserPlus,
  FaUserShield,
  FaUsers,
} from 'react-icons/fa';
import type { ParticipantResponse, ParticipantRole } from '@/services/types/chat';
import { anchorMenu } from './chatHelpers';

export type MuteDuration = '1h' | '24h' | 'forever';

interface Props {
  participants: ParticipantResponse[];
  currentUserId?: number;
  isGroup: boolean;
  canManage: boolean;
  canModerate: boolean;
  isOwner: boolean;
  onGrantRole: (accountId: number, role: ParticipantRole) => void;
  onRevokeRole: (accountId: number) => void;
  onMute: (accountId: number, duration: MuteDuration) => void;
  onUnmute: (accountId: number) => void;
  onBan: (accountId: number) => void;
  onUnban: (accountId: number) => void;
  onKick: (accountId: number) => void;
  onTransferOwner: (accountId: number) => void;
  onStartPrivateChat: (accountId: number) => void;
  onAddMembers: () => void;
}

const roleLabel: Record<ParticipantRole, string> = {
  OWNER: 'Trưởng nhóm',
  ADMIN: 'Quản trị',
  MODERATOR: 'Điều hành',
  MEMBER: 'Thành viên',
};

const roleTagClass: Record<ParticipantRole, string> = {
  OWNER: 'bg-amber-100 text-amber-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MODERATOR: 'bg-emerald-100 text-emerald-700',
  MEMBER: 'bg-slate-100 text-slate-500',
};

const formatMutedUntil = (until?: string | null) => {
  if (!until) return 'vĩnh viễn';
  const d = new Date(until);
  if (Number.isNaN(d.getTime())) return 'vĩnh viễn';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const tag = 'rounded-full px-1.5 py-px text-[9.5px] font-bold leading-[14px]';
const menuItem =
  'flex w-full items-center gap-2 rounded-[7px] border-0 bg-transparent px-2.5 py-2 text-left text-xs font-semibold transition-colors';

const MembersView = ({
  participants,
  currentUserId,
  isGroup,
  canManage,
  canModerate,
  isOwner,
  onGrantRole,
  onRevokeRole,
  onMute,
  onUnmute,
  onBan,
  onUnban,
  onKick,
  onTransferOwner,
  onStartPrivateChat,
  onAddMembers,
}: Props) => {
  const [menu, setMenu] = useState<{ id: number; top: number; left: number } | null>(null);
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const order: Record<string, number> = { OWNER: 0, ADMIN: 1, MODERATOR: 2, MEMBER: 3 };
    const sorted = [...participants].sort(
      (a, b) => (order[a.roleInConversation] ?? 9) - (order[b.roleInConversation] ?? 9),
    );
    if (!kw) return sorted;
    return sorted.filter((p) =>
      `${p.fullName || ''} ${p.username || ''}`.toLowerCase().includes(kw),
    );
  }, [participants, keyword]);

  const target = filtered.find((p) => p.accountId === menu?.id) ?? null;

  /** Được thao tác trên người này (không phải mình, không phải OWNER trừ khi mình là OWNER) */
  const actionable = target
    ? target.accountId !== currentUserId &&
      (target.roleInConversation !== 'OWNER' || isOwner)
    : false;

  const openMenu = (e: MouseEvent<HTMLButtonElement>, accountId: number) => {
    if (menu?.id === accountId) {
      setMenu(null);
      return;
    }
    setMenu({ id: accountId, ...anchorMenu(e.currentTarget, 196, 288) });
  };

  const close = () => setMenu(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-100 px-3 pb-1.5 pt-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <FaSearch
              size={11}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm thành viên..."
              className="h-8 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
            />
          </div>
          {isGroup && canManage && (
            <button
              type="button"
              onClick={onAddMembers}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[10px] bg-brand px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-brand-600"
            >
              <FaUserPlus size={10} />
              Thêm
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
          <FaUsers size={9} />
          {participants.length} thành viên
          {!isGroup && ' · chat riêng'}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" onScroll={close}>
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <FaUsers className="mb-1 text-[26px] text-slate-300" />
            <div className="text-[12.5px] font-semibold text-slate-500">
              Không tìm thấy thành viên
            </div>
          </div>
        ) : (
          filtered.map((p) => {
            const isSelf = p.accountId === currentUserId;

            return (
              <div
                key={p.accountId}
                className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (p.fullName || p.username || '?').charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="truncate text-[12.5px] font-semibold leading-[17px] text-slate-800">
                      {p.fullName || p.username || `User #${p.accountId}`}
                    </span>
                    {p.roleInConversation === 'OWNER' && (
                      <FaCrown size={10} className="shrink-0 text-amber-500" />
                    )}
                    {isSelf && (
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">
                        (Bạn)
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1">
                    <span className={`${tag} shrink-0 ${roleTagClass[p.roleInConversation]}`}>
                      {roleLabel[p.roleInConversation] || p.roleInConversation}
                    </span>
                    {p.chatStatus === 'MUTED' && (
                      <span className={`${tag} shrink-0 bg-orange-100 text-orange-700`}>
                        Mute · {formatMutedUntil(p.mutedUntil)}
                      </span>
                    )}
                    {p.chatStatus === 'BANNED' && (
                      <span className={`${tag} shrink-0 bg-rose-100 text-rose-700`}>Banned</span>
                    )}
                    {p.chatStatus === 'ACTIVE' && (
                      <span className="truncate text-[10.5px] text-slate-400">
                        {p.username || ''}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => openMenu(e, p.accountId)}
                  disabled={isSelf}
                  className={`inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border bg-transparent transition-colors ${
                    isSelf
                      ? 'cursor-default border-transparent text-transparent'
                      : menu?.id === p.accountId
                        ? 'border-slate-200 bg-white text-slate-700'
                        : 'border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-700'
                  }`}
                  title={isSelf ? undefined : 'Tuỳ chọn thành viên'}
                >
                  <FaEllipsisV size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {menu && target && (
        <>
          <div className="fixed inset-0 z-[1250]" onClick={close} />
          <div
            className="fixed z-[1300] max-h-[300px] min-w-[196px] overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-[0_12px_28px_-10px_rgba(15,23,42,0.26),0_2px_6px_rgba(15,23,42,0.06)]"
            style={{ top: menu.top, left: menu.left }}
          >
            {isGroup && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onStartPrivateChat(target.accountId);
                }}
                className={`${menuItem} text-slate-600 hover:bg-slate-50`}
              >
                <FaComments size={10} className="text-brand-700" /> Nhắn tin riêng
              </button>
            )}

            {canManage && actionable && target.roleInConversation !== 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onGrantRole(target.accountId, 'ADMIN');
                }}
                className={`${menuItem} text-blue-600 hover:bg-blue-50`}
              >
                <FaUserShield size={10} /> Cấp quyền ADMIN
              </button>
            )}
            {canManage && actionable && target.roleInConversation === 'MEMBER' && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onGrantRole(target.accountId, 'MODERATOR');
                }}
                className={`${menuItem} text-emerald-600 hover:bg-emerald-50`}
              >
                <FaUserShield size={10} /> Cấp quyền MODERATOR
              </button>
            )}
            {canManage &&
              actionable &&
              (target.roleInConversation === 'ADMIN' ||
                target.roleInConversation === 'MODERATOR') && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onRevokeRole(target.accountId);
                  }}
                  className={`${menuItem} text-slate-600 hover:bg-slate-100`}
                >
                  <FaUserMinus size={10} /> Thu hồi quyền
                </button>
              )}

            {canModerate && actionable && target.chatStatus !== 'MUTED' && (
              <>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onMute(target.accountId, '1h');
                  }}
                  className={`${menuItem} text-orange-600 hover:bg-orange-50`}
                >
                  <FaMicrophoneSlash size={10} /> Mute 1 giờ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onMute(target.accountId, '24h');
                  }}
                  className={`${menuItem} text-orange-600 hover:bg-orange-50`}
                >
                  <FaMicrophoneSlash size={10} /> Mute 24 giờ
                </button>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onMute(target.accountId, 'forever');
                    }}
                    className={`${menuItem} text-orange-600 hover:bg-orange-50`}
                  >
                    <FaMicrophoneSlash size={10} /> Mute vĩnh viễn
                  </button>
                )}
              </>
            )}
            {canModerate && actionable && target.chatStatus === 'MUTED' && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onUnmute(target.accountId);
                }}
                className={`${menuItem} text-orange-600 hover:bg-orange-50`}
              >
                <FaCheck size={10} /> Bỏ Mute
              </button>
            )}

            {canManage && actionable && target.chatStatus !== 'BANNED' && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onBan(target.accountId);
                }}
                className={`${menuItem} text-rose-600 hover:bg-rose-50`}
              >
                <FaBan size={10} /> Cấm chat (Ban)
              </button>
            )}
            {canManage && actionable && target.chatStatus === 'BANNED' && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onUnban(target.accountId);
                }}
                className={`${menuItem} text-slate-600 hover:bg-slate-100`}
              >
                <FaCheck size={10} /> Bỏ Ban
              </button>
            )}

            {isOwner && actionable && target.roleInConversation !== 'OWNER' && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onTransferOwner(target.accountId);
                }}
                className={`${menuItem} text-amber-600 hover:bg-amber-50`}
              >
                <FaArrowUp size={10} /> Chuyển quyền OWNER
              </button>
            )}

            {canManage && actionable && (
              <>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onKick(target.accountId);
                  }}
                  className={`${menuItem} text-rose-600 hover:bg-rose-50`}
                >
                  <FaTrash size={10} /> Xoá khỏi nhóm
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MembersView;
