// src/types/chat.types.ts

// ═══════════════════════════════════════════════════════════════
// ENUMS (match BE)
// ═══════════════════════════════════════════════════════════════
export type ConversationType = 'PRIVATE' | 'GROUP' | 'COURSE';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO' | 'SYSTEM';
export type MessagePermission = 'EVERYONE' | 'ADMIN_ONLY' | 'READ_ONLY';
export type ParticipantRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
export type ChatStatus = 'ACTIVE' | 'MUTED' | 'BANNED';

// Legacy alias cho code cũ
export type ConversationRole = ParticipantRole;

// ═══════════════════════════════════════════════════════════════
// ENTITIES
// ═══════════════════════════════════════════════════════════════
export interface ParticipantInfo {
  accountId: number;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
  roleInConversation: ParticipantRole;
}

export interface Conversation {
  id: number;
  conversationType: ConversationType;
  name?: string | null;
  courseId?: number | null;
  createdBy?: number | null;
  lastMessageId?: number | null;
  lastMessageAt?: string | null;
  messagePermission: MessagePermission;
  privateChatKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // per-user
  unreadCount?: number;
  lastMessagePreview?: string | null;
  isPinned?: boolean;
  isMutedByUser?: boolean;
  isArchived?: boolean;
  participants?: ParticipantInfo[];
}

export type ConversationResponse = Conversation;

export interface Participant {
  id: number;
  conversationId: number;
  accountId: number;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  roleInConversation: ParticipantRole;
  chatStatus: ChatStatus;
  isAdmin: boolean;
  mutedUntil?: string | null;
  mutedReason?: string | null;
  banReason?: string | null;
  unreadCount?: number;
  lastReadMessageId?: number | null;
  joinedAt?: string;
  leftAt?: string | null;
}

export type ParticipantResponse = Participant;

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName?: string | null;
  senderUsername?: string | null;
  senderAvatarUrl?: string | null;
  messageType: MessageType;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  fileFormat?: string | null;
  replyToMessageId?: number | null;
  replyToContent?: string | null;
  replyToSenderName?: string | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type MessageResponse = Message;

// ═══════════════════════════════════════════════════════════════
// SEARCH & CONTACTS
// ═══════════════════════════════════════════════════════════════
export interface UserSearchResult {
  accountId: number;
  username: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  hasPrivateConversation: boolean;
  existingConversationId?: number | null;
}

export type UserSearchResponse = UserSearchResult;

export interface TeacherContact {
  accountId: number;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface CourseContact {
  courseId: number;
  title: string;
  imageUrl?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// REQUEST PAYLOADS
// ═══════════════════════════════════════════════════════════════
export interface CreateConversationPayload {
  conversationType: ConversationType;
  name?: string;
  participantIds?: number[];
  courseId?: number;
}

export interface SendMessagePayload {
  messageType: MessageType;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileFormat?: string;
  replyToMessageId?: number;
}

// ═══════════════════════════════════════════════════════════════
// WS PAYLOADS
// ═══════════════════════════════════════════════════════════════
export interface WsErrorPayload {
  message: string;
  status: number;
  type: string;
  timestamp: number;
}

export interface WsConversationEvent {
  action: 'NEW_CONVERSATION' | 'REMOVED_FROM_CONVERSATION' | 'PREFERENCE_CHANGED';
  conversationId: number;
  field?: 'isPinned' | 'isMutedByUser' | 'isArchived';
  value?: boolean;
}

export interface WsNameChangedEvent {
  conversationId: number;
  newName: string;
}

export interface WsPermissionChangedEvent {
  messagePermission: MessagePermission;
}

export interface WsParticipantChangedEvent {
  action: 'REMOVED' | 'MUTED' | 'UNMUTED' | 'BANNED' | 'UNBANNED';
  accountId: number;
}

export interface WsRoleChangedEvent {
  accountId: number;
  role: ParticipantRole;
}

export interface WsOwnershipTransferredEvent {
  newOwnerId: number;
}

export interface WsMessageDeletedEvent {
  messageId: number;
}

export interface WsReadEvent {
  accountId: number;
  lastReadMessageId: number | null;
}

export interface WsTypingEvent {
  accountId: number;
  isTyping: boolean;
}