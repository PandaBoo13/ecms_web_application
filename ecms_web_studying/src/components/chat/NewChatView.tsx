// src/components/chat/NewChatView.tsx
import { useEffect, useState } from 'react';
import { FaComments, FaSearch, FaSpinner, FaUserPlus, FaUsers } from 'react-icons/fa';
import { chatApi } from '@/services/api/chat';
import type { UserSearchResponse } from '@/services/types/chat';

interface Props {
  onStartChat: (user: UserSearchResponse) => void;
  onCreateGroup: () => void;
  /** accountId đang được mở hội thoại */
  startingId?: number | null;
}

interface SearchState {
  keyword: string;
  loading: boolean;
  users: UserSearchResponse[];
}

/**
 * Tab "Mới": tìm người dùng để nhắn tin riêng hoặc tạo nhóm chat.
 * BE: GET /api/chat/users/search + POST /api/chat/conversations (PRIVATE)
 */
const NewChatView = ({ onStartChat, onCreateGroup, startingId = null }: Props) => {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState<SearchState>({
    keyword: '',
    loading: false,
    users: [],
  });

  useEffect(() => {
    const kw = keyword.trim();
    if (kw.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setSearch((prev) => ({ ...prev, keyword: kw, loading: true }));
      try {
        const res = await chatApi.searchUsers(kw);
        if (!cancelled) {
          setSearch({ keyword: kw, loading: false, users: Array.isArray(res) ? res : [] });
        }
      } catch {
        if (!cancelled) setSearch({ keyword: kw, loading: false, users: [] });
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword]);

  const kw = keyword.trim();
  const isActive = kw.length >= 2;
  const isFresh = isActive && search.keyword === kw;
  const loading = isActive && (search.loading || !isFresh);
  const users = isFresh ? search.users : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onCreateGroup}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-brand text-xs font-bold text-white transition-colors hover:bg-brand-600"
        >
          <FaUsers size={12} />
          Tạo nhóm chat mới
        </button>
        <div className="relative">
          <FaSearch
            size={11}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm người dùng (tên, email...)"
            autoFocus
            className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-3">
        {!isActive ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <FaUserPlus className="mb-1 text-[26px] text-slate-300" />
            <div className="text-[12.5px] font-semibold text-slate-500">Tìm kiếm người dùng</div>
            <div className="text-[11px] text-slate-400">Nhập ít nhất 2 ký tự</div>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-brand">
            <FaSpinner className="animate-spin" size={22} />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <FaSearch className="mb-1 text-[26px] text-slate-300" />
            <div className="text-[12.5px] font-semibold text-slate-500">
              Không tìm thấy người dùng
            </div>
            <div className="text-[11px] text-slate-400">Thử từ khoá khác</div>
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.accountId}
              className="flex items-center gap-2.5 rounded-[10px] border border-slate-100 p-2 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 text-xs font-bold text-brand">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (u.fullName || u.username || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold leading-4 text-slate-800">
                  {u.fullName || u.username || `User #${u.accountId}`}
                </div>
                <div className="truncate text-[10.5px] leading-[14px] text-slate-400">
                  {u.email || u.phone || u.username}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onStartChat(u)}
                disabled={startingId === u.accountId}
                className="inline-flex h-[26px] shrink-0 items-center gap-1 rounded-full border border-brand bg-white px-2 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-brand hover:text-white disabled:opacity-60"
              >
                {startingId === u.accountId ? (
                  <FaSpinner className="animate-spin" size={10} />
                ) : (
                  <>
                    <FaComments size={10} />
                    {u.hasPrivateConversation ? 'Vào chat' : 'Nhắn tin'}
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NewChatView;
