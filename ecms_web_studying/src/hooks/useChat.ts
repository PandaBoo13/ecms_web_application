// src/hooks/useChat.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './useAuth';
import { connectWs, subscribeWs } from '../services/wsClient';
import * as chatService from '../services/api/chat';
import type {
  Conversation,
  Message,
  MessagePermission,
  Participant,
  ParticipantRole,
  WsErrorPayload,
  WsMessageDeletedEvent,
  WsNameChangedEvent,
  WsParticipantChangedEvent,
  WsPermissionChangedEvent,
  WsReadEvent,
} from '../services/types/chat';

/** Số tin nhắn mỗi lần tải (khớp default của BE) */
const MESSAGE_PAGE_SIZE = 50;
/** Số hội thoại tải về (BE cap 100) */
const CONVERSATION_PAGE_SIZE = 100;

type AnyErr = { response?: { data?: { message?: string } }; message?: string };

/** Payload của /topic/user/{accountId}/conversations */
type UserConversationEvent = {
  action?: 'NEW_CONVERSATION' | 'REMOVED_FROM_CONVERSATION' | 'PREFERENCE_CHANGED';
  conversationId?: number;
  /** BE gửi "pinned" | "mutedByUser" | "archived" */
  field?: string;
  value?: boolean;
};

/**
 * PREFERENCE_CHANGED của BE gửi field dạng "pinned" | "mutedByUser" | "archived"
 * trong khi response HTTP dùng isPinned / isMutedByUser / isArchived.
 */
const applyPreference = (
  conv: Conversation,
  field: unknown,
  value?: boolean,
): Conversation => {
  const v = Boolean(value);
  if (field === 'pinned' || field === 'isPinned') return { ...conv, isPinned: v };
  if (field === 'mutedByUser' || field === 'isMutedByUser') return { ...conv, isMutedByUser: v };
  if (field === 'archived' || field === 'isArchived') return { ...conv, isArchived: v };
  return conv;
};

export const useChat = (onError?: (msg: string) => void) => {
  const { user } = useAuth();
  const currentUserId = user?.accountId;

  // ═══════════════════════════════════════════════════════════
  // ERROR — giữ callback trong ref để mọi handler giữ identity ổn định
  // ═══════════════════════════════════════════════════════════
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const notify = useCallback((msg: string) => {
    onErrorRef.current?.(msg);
  }, []);

  const errMsg = useCallback(
    (err: unknown, fallback: string) => {
      const e = err as AnyErr | undefined;
      notify(e?.response?.data?.message || e?.message || fallback);
    },
    [notify],
  );

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  /** accountId → lastReadMessageId (từ topic .../read) */
  const [readReceipts, setReadReceipts] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  /** page kế tiếp dùng để tải tin nhắn cũ hơn */
  const olderPageRef = useRef(1);

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.unreadCount || 0), 0),
    [conversations],
  );

  const currentParticipant = useMemo(
    () => participants.find((p) => p.accountId === currentUserId) ?? null,
    [participants, currentUserId],
  );

  // ═══════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await chatService.getMyConversations(0, CONVERSATION_PAGE_SIZE);
      setConversations(Array.isArray(list) ? list : []);
    } catch (err) {
      errMsg(err, 'Không tải được danh sách hội thoại');
    } finally {
      setLoading(false);
    }
  }, [errMsg]);

  const fetchParticipants = useCallback(async (convId: number) => {
    try {
      const parts = await chatService.getParticipants(convId);
      setParticipants(Array.isArray(parts) ? parts : []);
    } catch (err) {
      console.error('[useChat] fetchParticipants:', err);
    }
  }, []);

  const fetchMessages = useCallback(
    async (convId: number) => {
      setLoadingMessages(true);
      try {
        const res = await chatService.getMessages(convId, 0, MESSAGE_PAGE_SIZE);
        setMessages(res);
        olderPageRef.current = 1;
        setHasMoreMessages(res.length >= MESSAGE_PAGE_SIZE);
        if (res.length > 0) {
          const lastId = res[res.length - 1].id;
          chatService.markAsRead(convId, lastId).catch(() => {});
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)),
          );
        }
      } catch (err) {
        errMsg(err, 'Không tải được tin nhắn');
      } finally {
        setLoadingMessages(false);
      }
    },
    [errMsg],
  );

  /**
   * BE trả page 0 = MESSAGE_PAGE_SIZE tin MỚI NHẤT (đã sort tăng dần),
   * page 1 = lô cũ hơn kế tiếp → tải thêm bằng cách tăng page.
   */
  const loadOlderMessages = useCallback(async () => {
    if (!activeConversation || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    try {
      const page = olderPageRef.current;
      const older = await chatService.getMessages(activeConversation.id, page, MESSAGE_PAGE_SIZE);

      if (older.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = older.filter((m) => !ids.has(m.id));
        return [...merged, ...prev];
      });
      olderPageRef.current = page + 1;
      setHasMoreMessages(older.length >= MESSAGE_PAGE_SIZE);
    } catch (err) {
      errMsg(err, 'Không tải thêm được tin nhắn');
    } finally {
      setLoadingMore(false);
    }
  }, [activeConversation, loadingMore, hasMoreMessages, errMsg]);

  // ═══════════════════════════════════════════════════════════
  // NAV
  // ═══════════════════════════════════════════════════════════
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      setActiveConversation(conv);
      setMessages([]);
      setParticipants([]);
      setReadReceipts({});
      setTypingUsers(new Set());
      setHasMoreMessages(false);
      olderPageRef.current = 1;
      await Promise.all([fetchMessages(conv.id), fetchParticipants(conv.id)]);
    },
    [fetchMessages, fetchParticipants],
  );

  const closeConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
    setParticipants([]);
    setReadReceipts({});
    setTypingUsers(new Set());
    setHasMoreMessages(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SEND
  // ═══════════════════════════════════════════════════════════
  const sendMessage = useCallback(
    async (content: string, replyToMessageId?: number | null) => {
      const cid = activeConversation?.id;
      const text = content.trim();
      if (!cid || !text) return;

      try {
        const created = await chatService.sendMessage(cid, {
          messageType: 'TEXT',
          content: text,
          replyToMessageId: replyToMessageId || undefined,
        });

        // WS echo có thể về trước khi HTTP resolve → dedupe theo id
        if (created?.id) {
          setMessages((prev) =>
            prev.some((m) => m.id === created.id) ? prev : [...prev, created],
          );
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === cid
              ? {
                  ...c,
                  lastMessageId: created?.id ?? c.lastMessageId,
                  lastMessageAt: created?.createdAt ?? new Date().toISOString(),
                  lastMessagePreview: text.slice(0, 255),
                  unreadCount: 0,
                }
              : c,
          ),
        );

        return created;
      } catch (err) {
        errMsg(err, 'Gửi tin nhắn thất bại');
        throw err;
      }
    },
    [activeConversation?.id, errMsg],
  );

  /** BE ECMS chưa có endpoint typing → no-op (giữ API cho UI) */
  const sendTyping = useCallback(() => {}, []);

  // ═══════════════════════════════════════════════════════════
  // WS — kết nối 1 lần (wsClient tự dedupe)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!currentUserId) return;
    connectWs();
  }, [currentUserId]);

  // ═══════════════════════════════════════════════════════════
  // WS GLOBAL — errors + sự kiện cấp user
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!currentUserId) return;

    const unsubError = subscribeWs('/user/queue/errors', (payload: WsErrorPayload) => {
      notify(payload?.message || 'Đã có lỗi xảy ra');
    });

    const unsubUserConv = subscribeWs(
      `/topic/user/${currentUserId}/conversations`,
      (p: UserConversationEvent) => {
        if (p?.action === 'NEW_CONVERSATION') {
          fetchConversations();
        } else if (p?.action === 'REMOVED_FROM_CONVERSATION') {
          setConversations((prev) => prev.filter((c) => c.id !== p.conversationId));
          setActiveConversation((prev) => {
            if (prev?.id !== p.conversationId) return prev;
            return null;
          });
          if (activeConversation?.id === p.conversationId) closeConversation();
        } else if (p?.action === 'PREFERENCE_CHANGED') {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === p.conversationId ? applyPreference(c, p.field, p.value) : c,
            ),
          );
        }
      },
    );

    return () => {
      unsubError();
      unsubUserConv();
    };
  }, [currentUserId, notify, fetchConversations, activeConversation?.id, closeConversation]);

  // ═══════════════════════════════════════════════════════════
  // WS CONVERSATION-SCOPED — 9 topics
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const cid = activeConversation?.id;
    if (!cid) return;

    const unsubs: Array<() => void> = [];

    // 1. Tin nhắn mới
    unsubs.push(
      subscribeWs(`/topic/conversation/${cid}`, (m: Message) => {
        if (!m?.id) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.senderId !== currentUserId) {
          chatService.markAsRead(cid, m.id).catch(() => {});
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === cid
              ? {
                  ...c,
                  lastMessageId: m.id,
                  lastMessageAt: m.createdAt,
                  lastMessagePreview:
                    m.messageType === 'TEXT'
                      ? (m.content || '').slice(0, 255)
                      : `[${m.messageType}]`,
                  unreadCount: m.senderId === currentUserId ? 0 : c.unreadCount,
                }
              : c,
          ),
        );
      }),
    );

    // 2. Đổi tên nhóm
    unsubs.push(
      subscribeWs(`/topic/conversation/${cid}/name-changed`, (p: WsNameChangedEvent) => {
        if (!p?.newName) return;
        setActiveConversation((prev) =>
          prev && prev.id === cid ? { ...prev, name: p.newName } : prev,
        );
        setConversations((prev) =>
          prev.map((c) => (c.id === cid ? { ...c, name: p.newName } : c)),
        );
      }),
    );

    // 3. Đổi quyền gửi tin
    unsubs.push(
      subscribeWs(
        `/topic/conversation/${cid}/permission-changed`,
        (p: WsPermissionChangedEvent) => {
          if (!p?.messagePermission) return;
          setActiveConversation((prev) =>
            prev && prev.id === cid
              ? { ...prev, messagePermission: p.messagePermission }
              : prev,
          );
        },
      ),
    );

    // 4. Thành viên thay đổi (mute/ban/unban/remove)
    unsubs.push(
      subscribeWs(
        `/topic/conversation/${cid}/participant-changed`,
        (p: WsParticipantChangedEvent) => {
          fetchParticipants(cid);
          if (p?.action === 'REMOVED' && p.accountId === currentUserId) {
            closeConversation();
            fetchConversations();
          }
        },
      ),
    );

    // 5. Đổi vai trò
    unsubs.push(
      subscribeWs(`/topic/conversation/${cid}/role-changed`, () => fetchParticipants(cid)),
    );

    // 6. Chuyển quyền OWNER
    unsubs.push(
      subscribeWs(`/topic/conversation/${cid}/ownership-transferred`, () =>
        fetchParticipants(cid),
      ),
    );

    // 7. Đã xem
    unsubs.push(
      subscribeWs(`/topic/conversation/${cid}/read`, (p: WsReadEvent) => {
        if (p?.accountId == null) return;
        setReadReceipts((prev) => ({ ...prev, [p.accountId]: p.lastReadMessageId ?? null }));
      }),
    );

    // 8. Sửa tin nhắn
    unsubs.push(
      subscribeWs(`/topic/conversation/${cid}/edit`, (updated: Message) => {
        if (!updated?.id) return;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }),
    );

    // 9. Xoá tin nhắn
    unsubs.push(
      subscribeWs(
        `/topic/conversation/${cid}/message-deleted`,
        (p: WsMessageDeletedEvent) => {
          if (!p?.messageId) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === p.messageId ? { ...m, isDeleted: true } : m)),
          );
        },
      ),
    );

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* ignore */
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id, currentUserId]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS — thành viên / quyền
  // ═══════════════════════════════════════════════════════════
  const wrap = useCallback(
    async (fn: () => Promise<unknown>, errText?: string) => {
      const cid = activeConversation?.id;
      try {
        await fn();
        if (cid) await fetchParticipants(cid);
      } catch (err) {
        errMsg(err, errText || 'Thao tác thất bại');
        throw err;
      }
    },
    [activeConversation?.id, fetchParticipants, errMsg],
  );

  const handleGrantRole = useCallback(
    (accountId: number, role: ParticipantRole) =>
      wrap(
        () => chatService.updateParticipantRole(activeConversation!.id, accountId, role),
        'Không thể cấp quyền',
      ),
    [activeConversation, wrap],
  );

  const handleRevokeRole = useCallback(
    (accountId: number) =>
      wrap(
        () => chatService.updateParticipantRole(activeConversation!.id, accountId, 'MEMBER'),
        'Không thể thu hồi quyền',
      ),
    [activeConversation, wrap],
  );

  const handleMuteMember = useCallback(
    (accountId: number, mutedUntil: string | null, reason?: string) =>
      wrap(
        () => chatService.muteParticipant(activeConversation!.id, accountId, mutedUntil, reason),
        'Không thể mute thành viên',
      ),
    [activeConversation, wrap],
  );

  const handleUnmuteMember = useCallback(
    (accountId: number) =>
      wrap(
        () => chatService.unmuteParticipant(activeConversation!.id, accountId),
        'Không thể bỏ mute',
      ),
    [activeConversation, wrap],
  );

  const handleBanMember = useCallback(
    (accountId: number, reason?: string) =>
      wrap(
        () => chatService.banParticipant(activeConversation!.id, accountId, reason),
        'Không thể ban thành viên',
      ),
    [activeConversation, wrap],
  );

  const handleUnbanMember = useCallback(
    (accountId: number) =>
      wrap(
        () => chatService.unbanParticipant(activeConversation!.id, accountId),
        'Không thể bỏ ban',
      ),
    [activeConversation, wrap],
  );

  const handleTransferOwnership = useCallback(
    (accountId: number) =>
      wrap(
        () => chatService.transferOwnership(activeConversation!.id, accountId),
        'Không thể chuyển quyền OWNER',
      ),
    [activeConversation, wrap],
  );

  const handleRemoveMember = useCallback(
    (accountId: number) =>
      wrap(
        () => chatService.removeParticipant(activeConversation!.id, accountId),
        'Không thể xoá thành viên',
      ),
    [activeConversation, wrap],
  );

  const handleAddParticipants = useCallback(
    async (accountIds: number[]) => {
      const cid = activeConversation?.id;
      if (!cid || accountIds.length === 0) return;
      try {
        const updated = await chatService.addParticipants(cid, accountIds);
        if (Array.isArray(updated) && updated.length > 0) setParticipants(updated);
        else await fetchParticipants(cid);
      } catch (err) {
        errMsg(err, 'Thêm thành viên thất bại');
        throw err;
      }
    },
    [activeConversation?.id, fetchParticipants, errMsg],
  );

  // ═══════════════════════════════════════════════════════════
  // HANDLERS — hội thoại
  // ═══════════════════════════════════════════════════════════
  const handleUpdateMessagePermission = useCallback(
    async (perm: MessagePermission) => {
      if (!activeConversation) return;
      try {
        await chatService.updateMessagePermission(activeConversation.id, perm);
        setActiveConversation((prev) => (prev ? { ...prev, messagePermission: perm } : prev));
      } catch (err) {
        errMsg(err, 'Không thể đổi quyền gửi tin');
        throw err;
      }
    },
    [activeConversation, errMsg],
  );

  const handleUpdateName = useCallback(
    async (newName: string) => {
      if (!activeConversation) return;
      const name = newName.trim();
      if (!name) return;
      try {
        await chatService.updateConversationName(activeConversation.id, name);
        setActiveConversation((prev) => (prev ? { ...prev, name } : prev));
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, name } : c)),
        );
      } catch (err) {
        errMsg(err, 'Không thể đổi tên nhóm');
        throw err;
      }
    },
    [activeConversation, errMsg],
  );

  const createGroupConversation = useCallback(
    async (name: string, participantIds: number[]) => {
      try {
        const conv = await chatService.createConversation({
          conversationType: 'GROUP',
          name: name.trim(),
          participantIds,
        });
        await fetchConversations();
        await selectConversation(conv);
        return conv;
      } catch (err) {
        errMsg(err, 'Không thể tạo nhóm chat');
        throw err;
      }
    },
    [fetchConversations, selectConversation, errMsg],
  );

  const startPrivateConversation = useCallback(
    async (accountId: number) => {
      try {
        const conv = await chatService.createPrivateConversation(accountId);
        await fetchConversations();
        await selectConversation(conv);
        return conv;
      } catch (err) {
        errMsg(err, 'Không thể bắt đầu trò chuyện');
        throw err;
      }
    },
    [fetchConversations, selectConversation, errMsg],
  );

  // ═══════════════════════════════════════════════════════════
  // HANDLERS — tin nhắn
  // ═══════════════════════════════════════════════════════════
  const deleteMessage = useCallback(
    async (messageId: number) => {
      try {
        await chatService.deleteMessage(messageId);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m)),
        );
      } catch (err) {
        errMsg(err, 'Xoá tin nhắn thất bại');
        throw err;
      }
    },
    [errMsg],
  );

  const editMessage = useCallback(
    async (messageId: number, content: string) => {
      try {
        const updated = await chatService.editMessage(messageId, content);
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
        return updated;
      } catch (err) {
        errMsg(err, 'Sửa tin nhắn thất bại');
        throw err;
      }
    },
    [errMsg],
  );

  // ═══════════════════════════════════════════════════════════
  // HANDLERS — tuỳ chọn riêng của user
  // ═══════════════════════════════════════════════════════════
  const handlePinConversation = useCallback(
    async (convId: number, pinned: boolean) => {
      try {
        await chatService.pinConversation(convId, pinned);
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, isPinned: pinned } : c)),
        );
      } catch (err) {
        errMsg(err, 'Thao tác thất bại');
        throw err;
      }
    },
    [errMsg],
  );

  const handleMuteConversationByUser = useCallback(
    async (convId: number, muted: boolean) => {
      try {
        await chatService.muteConversationByUser(convId, muted);
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, isMutedByUser: muted } : c)),
        );
      } catch (err) {
        errMsg(err, 'Thao tác thất bại');
        throw err;
      }
    },
    [errMsg],
  );

  const handleArchiveConversation = useCallback(
    async (convId: number, archived: boolean) => {
      try {
        await chatService.archiveConversation(convId, archived);
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, isArchived: archived } : c)),
        );
      } catch (err) {
        errMsg(err, 'Thao tác thất bại');
        throw err;
      }
    },
    [errMsg],
  );

  const getCurrentUserRole = useCallback((): ParticipantRole | null => {
    const me = participants.find((p) => p.accountId === currentUserId);
    return me?.roleInConversation ?? null;
  }, [participants, currentUserId]);

  return {
    // state
    conversations,
    activeConversation,
    messages,
    participants,
    currentParticipant,
    typingUsers,
    readReceipts,
    loading,
    loadingMessages,
    loadingMore,
    hasMoreMessages,
    totalUnread,
    currentUserId,
    // nav
    selectConversation,
    closeConversation,
    fetchConversations,
    fetchMessages,
    fetchParticipants,
    loadOlderMessages,
    // messages
    sendMessage,
    sendTyping,
    editMessage,
    deleteMessage,
    // conversation
    createGroupConversation,
    startPrivateConversation,
    handleUpdateName,
    handleUpdateMessagePermission,
    handleAddParticipants,
    handleRemoveMember,
    // members
    handleGrantRole,
    handleRevokeRole,
    handleMuteMember,
    handleUnmuteMember,
    handleBanMember,
    handleUnbanMember,
    handleTransferOwnership,
    // preferences
    handlePinConversation,
    handleMuteConversationByUser,
    handleArchiveConversation,
    // helpers
    getCurrentUserRole,
  };
};

export default useChat;
