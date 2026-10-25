import { useEffect, useRef, useState } from 'react';
import { FaRobot, FaPaperPlane, FaSpinner, FaTimes, FaTrash } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import { useAIAgent } from '@/hooks/useAIAgent';

const AIAgentWidget = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, loading, send, clear } = useAIAgent();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const submit = () => {
    if (!input.trim() || loading) return;
    void send(input);
    setInput('');
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-700"
        title="Trợ lý AI"
        aria-label="Trợ lý AI"
      >
        <FaRobot size={18} />
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-[1200] flex h-[600px] w-[400px] max-h-[calc(100vh-24px)] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_-18px_rgba(15,23,42,0.30),0_2px_10px_rgba(15,23,42,0.06)]">
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between bg-brand px-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/25">
                <FaRobot size={15} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-bold leading-[18px]">
                  Trợ lý ECMS
                </div>
                <div className="truncate text-[11px] leading-[15px] text-white/80">
                  Hỏi tôi về Lead, khóa học, học viên…
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-transparent text-white transition-colors hover:bg-white/20"
                  title="Xoá hội thoại"
                >
                  <FaTrash size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-transparent text-white transition-colors hover:bg-white/20"
                title="Đóng"
              >
                <FaTimes size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3"
          >
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <FaRobot size={28} className="mb-1 text-slate-300" />
                <div className="text-[12.5px] font-semibold text-slate-500">
                  Xin chào 👋
                </div>
                <div className="max-w-[260px] text-[11px] text-slate-400">
                  Thử hỏi: "Tạo lead Nguyễn Văn A, SĐT 0901234567"
                </div>
              </div>
            )}

            {messages.map((m) => {
              if (m.pending) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-400">
                      <FaSpinner className="mr-1 inline animate-spin" size={10} />
                      Đang suy nghĩ...
                    </div>
                  </div>
                );
              }
              if (m.error) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-600">
                      ⚠️ {m.error}
                    </div>
                  </div>
                );
              }
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13px] leading-[1.45] ${
                      isUser
                        ? 'rounded-br-[5px] bg-brand text-white'
                        : 'rounded-bl-[5px] border border-slate-200/80 bg-white text-slate-700'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex shrink-0 items-end gap-2 border-t border-slate-200 bg-white px-3 pb-2.5 pt-2"
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={loading}
              maxLength={2000}
              placeholder="Nhập tin nhắn... (Shift + Enter để xuống dòng)"
              className="min-h-9 max-h-24 flex-1 resize-none rounded-xl border border-slate-200 px-2.5 py-2 text-[13px] leading-[18px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-[3px] focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-45"
              title="Gửi"
            >
              {loading ? (
                <FaSpinner className="animate-spin" size={12} />
              ) : (
                <FaPaperPlane size={12} />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIAgentWidget;