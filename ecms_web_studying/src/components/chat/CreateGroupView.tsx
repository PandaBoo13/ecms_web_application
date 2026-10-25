// src/components/chat/CreateGroupView.tsx
import { useState } from 'react';
import { FaSpinner, FaTimes, FaUsers } from 'react-icons/fa';
import type { ConversationResponse, UserSearchResponse } from '@/services/types/chat';
import UserPicker from './UserPicker';

interface Props {
  /** Gọi API tạo nhóm (GROUP) — thường là useChat().createGroupConversation */
  onCreate: (name: string, participantIds: number[]) => Promise<ConversationResponse>;
  /** Điều hướng sau khi tạo xong */
  onCreated: (conversation: ConversationResponse) => void;
}

/**
 * View tạo nhóm chat: nhập tên + chọn thành viên.
 * BE: POST /api/chat/conversations { conversationType: 'GROUP', name, participantIds }
 */
const CreateGroupView = ({ onCreate, onCreated }: Props) => {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<UserSearchResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = selected.map((u) => u.accountId);
  const canSubmit = name.trim().length > 0 && selected.length > 0 && !submitting;

  const toggle = (u: UserSearchResponse) => {
    setError(null);
    setSelected((prev) =>
      prev.some((x) => x.accountId === u.accountId)
        ? prev.filter((x) => x.accountId !== u.accountId)
        : [...prev, u],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError(
        name.trim().length === 0
          ? 'Vui lòng nhập tên nhóm'
          : 'Vui lòng chọn ít nhất 1 thành viên',
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const conv = await onCreate(name.trim(), selectedIds);
      setName('');
      setSelected([]);
      onCreated(conv);
    } catch (err) {
      setError((err as { message?: string })?.message || 'Không thể tạo nhóm chat');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-100 px-3 pb-2.5 pt-2.5">
        <label className="mb-1 block text-[10.5px] font-bold text-slate-500">
          Tên nhóm <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <FaUsers
            size={11}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={255}
            autoFocus
            placeholder="VD: Nhóm K12 - Luyện đề"
            className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-[3px] focus:ring-brand/15"
          />
        </div>

        {selected.length > 0 && (
          <div className="mt-2 flex max-h-[76px] flex-wrap gap-1 overflow-y-auto">
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
        )}
      </div>

      <UserPicker
        selectedIds={selectedIds}
        onToggle={toggle}
        placeholder="Tìm người để thêm vào nhóm..."
        idleHint="Nhập ít nhất 2 ký tự để tìm thành viên"
      />

      <div className="shrink-0 border-t border-slate-200 px-3 pb-2.5 pt-2">
        {error && <div className="mb-1.5 text-[11px] font-semibold text-rose-500">{error}</div>}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-xs font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? (
              <FaSpinner className="animate-spin" size={12} />
            ) : (
              <FaUsers size={12} />
            )}
            Tạo nhóm
          </button>
          <span className="shrink-0 whitespace-nowrap text-[10.5px] text-slate-400">
            {selected.length} thành viên
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupView;
