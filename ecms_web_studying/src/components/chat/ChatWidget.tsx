// src/components/chat/ChatWidget.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArchive, FaComments, FaUsers } from 'react-icons/fa';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useWebSocket } from '@/hooks/useWebSocket';
import type {
  ConversationResponse,
  MessagePermission,
  MessageResponse,
  ParticipantRole,
  UserSearchResponse,
} from '@/services/types/chat';

import ChatWindowHeader from './ChatWindowHeader';
import ConversationList from './ConversationList';
import NewChatView from './NewChatView';
import ChatMessageList from './ChatMessageList';
import ChatMessageInput from './ChatMessageInput';
import MembersView from './MembersView';
import type { MuteDuration } from './MembersView';
import CreateGroupView from './CreateGroupView';
import AddMembersView from './AddMembersView';
import { getConvIcon, getConversationAvatar, getConversationTitle } from './chatHelpers';

type ViewMode = 'list' | 'chat' | 'members' | 'addMembers' | 'createGroup';
type ListTab = 'conversations' | 'archived' | 'new';

const pad = (n: number) => String(n).padStart(2, '0');

/** BE dùng LocalDateTime → gửi chuỗi ISO không có timezone */
const toLocalIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;

const muteUntilFor = (duration: MuteDuration): string | null => {
  if (duration === 'forever') return null;
  const ms = duration === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return toLocalIso(new Date(Date.now() + ms));
};

const MUTE_REASON: Record<MuteDuration, string> = {
  '1h': 'Mute 1 giờ',
  '24h': 'Mute 24 giờ',
  forever: 'Mute vĩnh viễn',
};

const ChatWidget = () => {
  const { isAuthenticated } = useAuth();
  const { connected } = useWebSocket();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [tab, setTab] = useState<ListTab>('conversations');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageResponse | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);

  const notifyError = useCallback((msg: string) => {
    toast.error(msg);
  }, []);

  const {
    conversations,
    activeConversation,
    messages,
    participants,
    currentParticipant,
    readReceipts,
    loading,
    loadingMessages,
    loadingMore,
    hasMoreMessages,
    totalUnread,
    currentUserId,
    selectConversation,
    closeConversation,
    fetchConversations,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    createGroupConversation,
    startPrivateConversation,
    handleUpdateName,
    handleUpdateMessagePermission,
    handleAddParticipants,
    handleRemoveMember,
    handleGrantRole,
    handleRevokeRole,
    handleMuteMember,
    handleUnmuteMember,
    handleBanMember,
    handleUnbanMember,
    handleTransferOwnership,
    handlePinConversation,
    handleMuteConversationByUser,
    handleArchiveConversation,
  } = useChat(notifyError);

  // ═══════════════════════════════════════════════════════════════
  // LOAD
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    void fetchConversations();
  }, [open, isAuthenticated, fetchConversations]);

  // BE chưa có topic tin nhắn theo từng user → đồng bộ nhẹ danh sách để
  // badge "chưa đọc" không bị cũ khi widget đóng.
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      void fetchConversations();
    }, 60_000);
    return () => clearInterval(timer);
  }, [isAuthenticated, fetchConversations]);

  // Chỉ báo "mất kết nối" khi WebSocket không lên sau 2.5s (tránh nhấp nháy)
  useEffect(() => {
    if (connected) return;
    const timer = setTimeout(() => setOffline(true), 2500);
    return () => clearTimeout(timer);
  }, [connected]);

  // ═══════════════════════════════════════════════════════════════
  // COMPUTE
  // ═══════════════════════════════════════════════════════════════
  const myRole = currentParticipant?.roleInConversation ?? null;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';
  const canModerate = canManage || myRole === 'MODERATOR';
  const isOwner = myRole === 'OWNER';
  const isGroup = activeConversation
    ? activeConversation.conversationType !== 'PRIVATE'
    : false;

  const filterByTab = useCallback(
    (archived: boolean) => {
      const kw = searchTerm.trim().toLowerCase();
      return conversations
        .filter((c) => Boolean(c.isArchived) === archived)
        .filter((c) => {
          if (!kw) return true;
          const name = (c.name || '').toLowerCase();
          const preview = (c.lastMessagePreview || '').toLowerCase();
          const people = (c.participants || [])
            .map((p) => `${p.fullName || ''} ${p.username || ''}`)
            .join(' ')
            .toLowerCase();
          return name.includes(kw) || preview.includes(kw) || people.includes(kw);
        })
        .sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned));
    },
    [conversations, searchTerm],
  );

  const activeList = useMemo(() => filterByTab(false), [filterByTab]);
  const archivedList = useMemo(() => filterByTab(true), [filterByTab]);

  const inputDisabled = useMemo(() => {
    if (!activeConversation) return false;
    if (currentParticipant?.chatStatus === 'BANNED') return true;
    if (currentParticipant?.chatStatus === 'MUTED') {
      const until = currentParticipant.mutedUntil;
      if (!until) return true;
      // BE chỉ tự mở mute khi user gửi tin → cần so với thời điểm hiện tại để mở khoá composer
      // eslint-disable-next-line react-hooks/purity
      if (new Date(until).getTime() > Date.now()) return true;
    }
    if (activeConversation.messagePermission === 'READ_ONLY') return true;
    if (activeConversation.messagePermission === 'ADMIN_ONLY' && !canModerate) return true;
    return false;
  }, [activeConversation, currentParticipant, canModerate]);

  const inputDisabledReason = useMemo(() => {
    if (!inputDisabled || !activeConversation) return undefined;
    if (currentParticipant?.chatStatus === 'BANNED') {
      return `Bạn đã bị cấm chat${
        currentParticipant.banReason ? `: ${currentParticipant.banReason}` : ''
      }`;
    }
    if (currentParticipant?.chatStatus === 'MUTED') {
      const until = currentParticipant.mutedUntil
        ? new Date(currentParticipant.mutedUntil).toLocaleString('vi-VN')
        : 'vĩnh viễn';
      return `Bạn đang bị mute đến ${until}`;
    }
    if (activeConversation.messagePermission === 'READ_ONLY') {
      return 'Hội thoại đang ở chế độ chỉ đọc';
    }
    if (activeConversation.messagePermission === 'ADMIN_ONLY') {
      return 'Chỉ quản trị viên mới được gửi tin nhắn';
    }
    return undefined;
  }, [inputDisabled, currentParticipant, activeConversation]);

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════
  const openConversation = (conv: ConversationResponse) => {
    setView('chat');
    setReplyingTo(null);
    void selectConversation(conv);
  };

  const backToList = () => {
    closeConversation();
    setReplyingTo(null);
    setView('list');
  };

  const handleClose = () => {
    setOpen(false);
    setView('list');
    setTab('conversations');
    setSearchTerm('');
    setReplyingTo(null);
    closeConversation();
  };

  const handleStartChat = async (u: UserSearchResponse) => {
    if (startingId) return;
    setStartingId(u.accountId);
    try {
      await startPrivateConversation(u.accountId);
      setTab('conversations');
      setView('chat');
      setReplyingTo(null);
    } catch {
      /* đã toast */
    } finally {
      setStartingId(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════════════════════════
  const handleSend = async (content: string) => {
    await sendMessage(content, replyingTo?.id ?? null);
    setReplyingTo(null);
  };

  const handleEditMessage = async (id: number, content: string) => {
    try {
      await editMessage(id, content);
    } catch {
      /* đã toast */
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (!window.confirm('Xoá tin nhắn này?')) return;
    try {
      await deleteMessage(id);
    } catch {
      /* đã toast */
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // CONVERSATION PREFERENCES
  // ═══════════════════════════════════════════════════════════════
  const handlePin = async (conv: ConversationResponse) => {
    try {
      await handlePinConversation(conv.id, !conv.isPinned);
    } catch {
      /* đã toast */
    }
  };

  const handleToggleMute = async (conv: ConversationResponse) => {
    try {
      await handleMuteConversationByUser(conv.id, !conv.isMutedByUser);
    } catch {
      /* đã toast */
    }
  };

  const handleToggleArchive = async (conv: ConversationResponse) => {
    try {
      await handleArchiveConversation(conv.id, !conv.isArchived);
    } catch {
      /* đã toast */
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // MEMBERS
  // ═══════════════════════════════════════════════════════════════
  const handleGrant = async (accountId: number, role: ParticipantRole) => {
    try {
      await handleGrantRole(accountId, role);
      toast.success(role === 'ADMIN' ? 'Đã cấp quyền ADMIN' : 'Đã cấp quyền MODERATOR');
    } catch {
      /* đã toast */
    }
  };

  const handleRevoke = async (accountId: number) => {
    try {
      await handleRevokeRole(accountId);
      toast.success('Đã thu hồi quyền');
    } catch {
      /* đã toast */
    }
  };

  const handleMute = async (accountId: number, duration: MuteDuration) => {
    try {
      await handleMuteMember(accountId, muteUntilFor(duration), MUTE_REASON[duration]);
      toast.success(duration === 'forever' ? 'Đã mute vĩnh viễn' : `Đã mute ${duration}`);
    } catch {
      /* đã toast */
    }
  };

  const handleUnmute = async (accountId: number) => {
    try {
      await handleUnmuteMember(accountId);
      toast.success('Đã bỏ mute');
    } catch {
      /* đã toast */
    }
  };

  const handleBan = async (accountId: number) => {
    if (!window.confirm('Cấm thành viên này gửi tin nhắn?')) return;
    try {
      await handleBanMember(accountId, 'Vi phạm nội quy');
      toast.success('Đã cấm thành viên');
    } catch {
      /* đã toast */
    }
  };

  const handleUnban = async (accountId: number) => {
    try {
      await handleUnbanMember(accountId);
      toast.success('Đã bỏ cấm');
    } catch {
      /* đã toast */
    }
  };

  const handleKick = async (accountId: number) => {
    if (!window.confirm('Xoá thành viên này khỏi nhóm?')) return;
    try {
      await handleRemoveMember(accountId);
      toast.success('Đã xoá khỏi nhóm');
    } catch {
      /* đã toast */
    }
  };

  const handleTransferOwner = async (accountId: number) => {
    if (
      !window.confirm('Chuyển quyền trưởng nhóm cho thành viên này? Bạn sẽ trở thành ADMIN.')
    ) {
      return;
    }
    try {
      await handleTransferOwnership(accountId);
      toast.success('Đã chuyển quyền trưởng nhóm');
    } catch {
      /* đã toast */
    }
  };

  const handleStartPrivate = async (accountId: number) => {
    try {
      await startPrivateConversation(accountId);
      setView('chat');
      setReplyingTo(null);
      setTab('conversations');
    } catch {
      /* đã toast */
    }
  };

  const handleAddMembers = async (accountIds: number[]) => {
    await handleAddParticipants(accountIds);
    toast.success('Đã thêm thành viên');
  };

  if (!isAuthenticated) return null;

  const tabClass = (active: boolean) =>
    `flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg border-0 bg-transparent text-[11.5px] font-semibold transition-all ${
      active
        ? 'bg-white text-brand-700 shadow-[0_1px_3px_rgba(15,23,42,0.12)]'
        : 'text-slate-500 hover:text-slate-700'
    }`;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[10px] border-0 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-700"
        title="Tin nhắn"
        aria-label="Tin nhắn"
      >
        <FaComments size={18} />
        {totalUnread > 0 && (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white shadow-[0_0_0_2px_#fff]">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-[1200] flex h-[600px] w-[400px] max-h-[calc(100vh-24px)] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_-18px_rgba(15,23,42,0.30),0_2px_10px_rgba(15,23,42,0.06)] animate-chat-in">
          {/* ════════ HEADER ════════ */}
          {view === 'list' && (
            <ChatWindowHeader
              title="Tin nhắn"
              subtitle={`${activeList.length} hội thoại${
                archivedList.length > 0 ? ` · ${archivedList.length} lưu trữ` : ''
              }`}
              onClose={handleClose}
            />
          )}

          {view === 'chat' && activeConversation && (
            <ChatWindowHeader
              title={getConversationTitle(activeConversation, currentUserId)}
              subtitle={
                isGroup
                  ? `${participants.length} thành viên · ${messages.length} tin nhắn`
                  : `Trò chuyện riêng · ${messages.length} tin nhắn`
              }
              showBack
              onBack={backToList}
              onClose={handleClose}
              avatarUrl={getConversationAvatar(activeConversation, currentUserId)}
              avatarEmoji={getConvIcon(activeConversation.conversationType)}
              isGroup={isGroup}
              canManage={canManage}
              messagePermission={
                (activeConversation.messagePermission as MessagePermission) || 'EVERYONE'
              }
              onShowMembers={() => setView('members')}
              onAddMembers={isGroup && canManage ? () => setView('addMembers') : undefined}
              onUpdateName={isGroup && canManage ? handleUpdateName : undefined}
              onUpdatePermission={
                isGroup && canManage ? handleUpdateMessagePermission : undefined
              }
            />
          )}

          {view === 'members' && activeConversation && (
            <ChatWindowHeader
              title="Thành viên"
              subtitle={`${participants.length} người`}
              showBack
              onBack={() => setView('chat')}
              onClose={handleClose}
            />
          )}

          {view === 'addMembers' && activeConversation && (
            <ChatWindowHeader
              title="Thêm thành viên"
              subtitle={getConversationTitle(activeConversation, currentUserId)}
              showBack
              onBack={() => setView('members')}
              onClose={handleClose}
            />
          )}

          {view === 'createGroup' && (
            <ChatWindowHeader
              title="Tạo nhóm chat"
              subtitle="Nhập tên và chọn thành viên"
              showBack
              onBack={() => setView('list')}
              onClose={handleClose}
            />
          )}

          {/* ════════ MẤT KẾT NỐI ════════ */}
          {!connected && offline && (
            <div className="flex shrink-0 items-center gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1 text-[10.5px] font-semibold text-amber-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              Mất kết nối realtime — đang kết nối lại...
            </div>
          )}

          {/* ════════ LIST VIEW ════════ */}
          {view === 'list' && (
            <div className="flex min-h-0 flex-1 flex-col bg-white">
              <div className="shrink-0 px-3 pb-0.5 pt-2.5">
                <div className="flex gap-0.5 rounded-xl bg-slate-100 p-[3px]">
                  <button
                    type="button"
                    onClick={() => setTab('conversations')}
                    className={tabClass(tab === 'conversations')}
                  >
                    <FaComments size={10} /> Đoạn chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('archived')}
                    className={tabClass(tab === 'archived')}
                  >
                    <FaArchive size={10} /> Lưu trữ
                    {archivedList.length > 0 && (
                      <span className="rounded-full bg-slate-200 px-1 text-[9.5px] font-bold leading-[14px] text-slate-500">
                        {archivedList.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('new')}
                    className={tabClass(tab === 'new')}
                  >
                    <FaUsers size={10} /> Mới
                  </button>
                </div>
              </div>

              {tab === 'new' ? (
                <NewChatView
                  onStartChat={handleStartChat}
                  onCreateGroup={() => setView('createGroup')}
                  startingId={startingId}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <ConversationList
                    conversations={tab === 'archived' ? archivedList : activeList}
                    currentUserId={currentUserId}
                    loading={loading}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    emptyTitle={
                      tab === 'archived'
                        ? 'Không có hội thoại lưu trữ'
                        : searchTerm
                          ? 'Không tìm thấy kết quả'
                          : 'Chưa có cuộc trò chuyện nào'
                    }
                    emptyHint={
                      tab === 'archived'
                        ? 'Hội thoại bạn lưu trữ sẽ xuất hiện ở đây'
                        : searchTerm
                          ? 'Thử từ khoá khác'
                          : 'Bắt đầu trò chuyện với đồng nghiệp'
                    }
                    emptyActionLabel={
                      tab === 'conversations' && !searchTerm
                        ? '+ Bắt đầu trò chuyện'
                        : undefined
                    }
                    onEmptyAction={() => setTab('new')}
                    onOpen={openConversation}
                    onPin={handlePin}
                    onToggleMute={handleToggleMute}
                    onToggleArchive={handleToggleArchive}
                  />
                </div>
              )}
            </div>
          )}

          {/* ════════ CHAT VIEW ════════ */}
          {view === 'chat' && activeConversation && (
            <>
              <ChatMessageList
                messages={messages}
                currentUserId={currentUserId}
                loading={loadingMessages}
                hasMore={hasMoreMessages}
                loadingMore={loadingMore}
                onLoadMore={loadOlderMessages}
                showSender={isGroup}
                canModerate={canModerate}
                canEdit={!inputDisabled}
                participants={participants}
                readReceipts={readReceipts}
                onReply={setReplyingTo}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
              <ChatMessageInput
                onSend={handleSend}
                disabled={inputDisabled}
                disabledReason={inputDisabledReason}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
              />
            </>
          )}

          {/* ════════ MEMBERS VIEW ════════ */}
          {view === 'members' && activeConversation && (
            <MembersView
              participants={participants}
              currentUserId={currentUserId}
              isGroup={isGroup}
              canManage={canManage}
              canModerate={canModerate}
              isOwner={isOwner}
              onGrantRole={handleGrant}
              onRevokeRole={handleRevoke}
              onMute={handleMute}
              onUnmute={handleUnmute}
              onBan={handleBan}
              onUnban={handleUnban}
              onKick={handleKick}
              onTransferOwner={handleTransferOwner}
              onStartPrivateChat={handleStartPrivate}
              onAddMembers={() => setView('addMembers')}
            />
          )}

          {/* ════════ ADD MEMBERS VIEW ════════ */}
          {view === 'addMembers' && activeConversation && (
            <AddMembersView
              participants={participants}
              onAdd={handleAddMembers}
              onDone={() => setView('members')}
            />
          )}

          {/* ════════ CREATE GROUP VIEW ════════ */}
          {view === 'createGroup' && (
            <CreateGroupView
              onCreate={createGroupConversation}
              onCreated={() => {
                setTab('conversations');
                setView('chat');
                setReplyingTo(null);
              }}
            />
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
