// src/components/chat/AddMembersView.tsx
import { useState } from 'react';
import { FaSpinner, FaTimes, FaUserPlus } from 'react-icons/fa';
import type { ParticipantResponse, UserSearchResponse } from '@/services/types/chat';
import UserPicker from './UserPicker';

interface Props {
  /** Nhóm hiện tại — dùng để loại các thành viên đã có */
  participants: ParticipantResponse[];
  /** useChat().handleAddParticipants */
  onAdd: (accountIds: number[]) => Promise<void>;
  /** Quay lại danh sách thành viên */
  onDone: () => void;
}

/**
 * View thêm thành viên vào nhóm.
 * BE: POST /api/chat/conversations/{id}/participants { accountIds }
 * (chỉ OWNER/ADMIN, không áp dụng cho PRIVATE)
 */
const AddMembersView = ({ participants, onAdd, onDone }: Props) => {
  const [selected, setSelected] = useState<UserSearchResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingIds = participants.map((p) => p.accountId);
  const selectedIds = selected.map((u) => u.accountId);

  const toggle = (u: UserSearchResponse) => {
    setError(null);
    setSelected((prev) =>
      prev.some((x) => x.accountId === u.accountId)
        ? prev.filter((x) => x.accountId !== u.accountId)
        : [...prev, u],
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 người');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(selectedIds);
      setSelected([]);
      onDone();
    } catch (err) {
      setError((err as { message?: string })?.message || 'Không thể thêm thành viên');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {selected.length > 0 && (
        <div className="shrink-0 border-b border-slate-100 px-3 pb-2.5 pt-2.5">
          <div className="flex max-h-[76px] flex-wrap gap-1 overflow-y-auto">
            <span className="self-center text-[10.5px] font-semibold text-slate-500">
              Đã chọn {selected.length}:
            </span>
            {selected.map((u) => (
              <span
                key={u.accountId}
                className="inline-flex items-center gap-1 rounded-full bg-brand/10 py-0.5 pl-2 pr-1 text-[10.5px] font-semibold leading-4 text-brand-700"
              >
                <span className="max-w-[120px] truncate">
                  {u.fullName || u.username || `User #${u.accountId}`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelected((prev) => prev.filter((x) => x.accountId !== u.accountId))
                  }
                  className="rounded-full border-0 bg-transparent p-0.5 transition-colors hover:bg-brand/20"
                  title="Bỏ chọn"
                >
                  <FaTimes size={8} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <UserPicker
        selectedIds={selectedIds}
        onToggle={toggle}
        excludeIds={existingIds}
        autoFocus
        placeholder="Tìm người để thêm vào nhóm..."
        emptyHint="Không còn người phù hợp để thêm"
        idleHint="Nhập ít nhất 2 ký tự để tìm người dùng"
      />

      <div className="shrink-0 border-t border-slate-200 px-3 pb-2.5 pt-2">
        {error && <div className="mb-1.5 text-[11px] font-semibold text-rose-500">{error}</div>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selectedIds.length === 0}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-xs font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? (
              <FaSpinner className="animate-spin" size={12} />
            ) : (
              <FaUserPlus size={12} />
            )}
            Thêm vào nhóm
          </button>
          <span className="shrink-0 whitespace-nowrap text-[10.5px] text-slate-400">
            Nhóm có {participants.length} người
          </span>
        </div>
      </div>
    </div>
  );
};

export default AddMembersView;
