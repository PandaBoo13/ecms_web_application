// src/components/chat/UserPicker.tsx
import { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaSearch, FaSpinner, FaUserPlus } from 'react-icons/fa';
import { chatApi } from '@/services/api/chat';
import type { UserSearchResponse } from '@/services/types/chat';

interface Props {
  /** accountId đang được chọn */
  selectedIds: number[];
  onToggle: (user: UserSearchResponse) => void;
  /** accountId bị loại khỏi danh sách (đã ở trong nhóm) */
  excludeIds?: number[];
  /** Số ký tự tối thiểu trước khi gọi API (BE yêu cầu >= 2) */
  minChars?: number;
  autoFocus?: boolean;
  placeholder?: string;
  emptyHint?: string;
  /** Nội dung gợi ý khi chưa nhập từ khoá */
  idleHint?: string;
}

interface SearchState {
  keyword: string;
  loading: boolean;
  users: UserSearchResponse[];
}

/**
 * Ô tìm kiếm + danh sách người dùng để chọn (dùng cho Tạo nhóm / Thêm thành viên).
 * BE: GET /api/chat/users/search?keyword=
 */
const UserPicker = ({
  selectedIds,
  onToggle,
  excludeIds = [],
  minChars = 2,
  autoFocus = false,
  placeholder = 'Tìm người dùng...',
  emptyHint = 'Không tìm thấy người dùng',
  idleHint = 'Nhập ít nhất 2 ký tự để tìm kiếm',
}: Props) => {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState<SearchState>({
    keyword: '',
    loading: false,
    users: [],
  });

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  useEffect(() => {
    const kw = keyword.trim();
    if (kw.length < minChars) return;

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
  }, [keyword, minChars]);

  const kw = keyword.trim();
  const isActive = kw.length >= minChars;
  const isFresh = isActive && search.keyword === kw;
  const loading = isActive && (search.loading || !isFresh);
  const users = isFresh ? search.users : [];
  const visible = users.filter((u) => !excluded.has(u.accountId));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 px-3 py-2">
        <FaSearch
          size={11}
          className="pointer-events-none absolute left-[22px] top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
        {!isActive ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <FaUserPlus className="mb-1 text-[26px] text-slate-300" />
            <div className="text-[12.5px] font-semibold text-slate-500">Tìm người dùng</div>
            <div className="text-[11px] text-slate-400">{idleHint}</div>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-brand">
            <FaSpinner className="animate-spin" size={20} />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <FaSearch className="mb-1 text-[26px] text-slate-300" />
            <div className="text-[12.5px] font-semibold text-slate-500">{emptyHint}</div>
          </div>
        ) : (
          visible.map((u) => {
            const active = selectedIds.includes(u.accountId);
            return (
              <button
                type="button"
                key={u.accountId}
                onClick={() => onToggle(u)}
                className={`flex w-full items-center gap-2.5 rounded-[10px] border bg-white p-2 text-left transition-colors ${
                  active
                    ? 'border-brand bg-brand/[0.06]'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
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
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-300 text-transparent'
                  }`}
                >
                  <FaCheck size={8} />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserPicker;
