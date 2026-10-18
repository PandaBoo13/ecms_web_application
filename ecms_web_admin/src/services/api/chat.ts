// src/service/chatService.ts
import axios from 'axios';
import type {
  Conversation,
  CreateConversationPayload,
  CourseContact,
  Message,
  MessagePermission,
  Participant,
  ParticipantRole,
  SendMessagePayload,
  TeacherContact,
  UserSearchResult,
} from '../types/chat';

// ═══════════════════════════════════════════════════════════════
// HTTP helper — unwrap RequestResponse
// Response BE: { data: <payload>, message: "OK" }
// ═══════════════════════════════════════════════════════════════
const API = '/api/chat';

type PageResult<T> = { content?: T[] };

const unwrap = <T,>(res: { data?: unknown }): T => {
  const body = res?.data;
  if (body && typeof body === 'object') {
    if ('data' in body) return (body as { data: T }).data;
    if ('result' in body) return (body as { result: T }).result;
  }
  return body as T;
};

// ═══════════════════════════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
export const getMyConversations = async (
  page = 0,
  size = 20,
): Promise<Conversation[]> => {
  const res = await axios.get(`${API}/conversations`, { params: { page, size } });
  const pageData = unwrap<PageResult<Conversation>>(res);
  return pageData?.content ?? [];
};

export const getConversationById = async (id: number): Promise<Conversation> => {
  const res = await axios.get(`${API}/conversations/${id}`);
  return unwrap<Conversation>(res);
};

export const createConversation = async (
  payload: CreateConversationPayload,
): Promise<Conversation> => {
  const res = await axios.post(`${API}/conversations`, payload);
  return unwrap<Conversation>(res);
};

export const createPrivateConversation = async (accountId: number): Promise<Conversation> => {
  return createConversation({
    conversationType: 'PRIVATE',
    participantIds: [accountId],
  });
};

export const updateConversationName = async (id: number, name: string): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/name`, { name });
};

export const updateMessagePermission = async (
  id: number,
  permission: MessagePermission,
): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/permission`, { permission });
};

// ═══════════════════════════════════════════════════════════════
// PARTICIPANTS
// ═══════════════════════════════════════════════════════════════
export const getParticipants = async (id: number): Promise<Participant[]> => {
  const res = await axios.get(`${API}/conversations/${id}/participants`);
  return unwrap<Participant[]>(res) ?? [];
};

export const addParticipants = async (id: number, accountIds: number[]): Promise<Participant[]> => {
  const res = await axios.post(`${API}/conversations/${id}/participants`, { accountIds });
  return unwrap<Participant[]>(res) ?? [];
};

export const removeParticipant = async (id: number, accountId: number): Promise<void> => {
  await axios.delete(`${API}/conversations/${id}/participants/${accountId}`);
};

export const updateParticipantRole = async (
  id: number,
  accountId: number,
  role: ParticipantRole,
): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/participants/${accountId}/role`, { role });
};

export const muteParticipant = async (
  id: number,
  accountId: number,
  mutedUntil: string | null,
  reason?: string,
): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/participants/${accountId}/mute`, {
    mutedUntil,
    reason,
  });
};

export const unmuteParticipant = async (id: number, accountId: number): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/participants/${accountId}/unmute`);
};

export const banParticipant = async (
  id: number,
  accountId: number,
  reason?: string,
): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/participants/${accountId}/ban`, { reason });
};

export const unbanParticipant = async (id: number, accountId: number): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/participants/${accountId}/unban`);
};

export const transferOwnership = async (id: number, newOwnerAccountId: number): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/transfer-ownership`, { newOwnerAccountId });
};

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════
export const getMessages = async (id: number, page = 0, size = 50): Promise<Message[]> => {
  const res = await axios.get(`${API}/conversations/${id}/messages`, {
    params: { page, size },
  });
  return unwrap<Message[]>(res) ?? [];
};

export const sendMessage = async (
  id: number,
  payload: SendMessagePayload,
): Promise<Message> => {
  const res = await axios.post(`${API}/conversations/${id}/messages`, payload);
  return unwrap<Message>(res);
};

export const markAsRead = async (id: number, lastReadMessageId: number): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/read`, { lastReadMessageId });
};

export const editMessage = async (messageId: number, content: string): Promise<Message> => {
  const res = await axios.put(`${API}/messages/${messageId}`, { content });
  return unwrap<Message>(res);
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  await axios.delete(`${API}/messages/${messageId}`);
};

// ═══════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════
export const searchUsers = async (keyword: string): Promise<UserSearchResult[]> => {
  const res = await axios.get(`${API}/users/search`, { params: { keyword } });
  return unwrap<UserSearchResult[]>(res) ?? [];
};

// ═══════════════════════════════════════════════════════════════
// PREFERENCES (per-user)
// ═══════════════════════════════════════════════════════════════
export const pinConversation = async (id: number, pinned: boolean): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/pin`, null, { params: { pinned } });
};

export const muteConversationByUser = async (id: number, muted: boolean): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/mute-by-user`, null, { params: { muted } });
};

export const archiveConversation = async (id: number, archived: boolean): Promise<void> => {
  await axios.patch(`${API}/conversations/${id}/archive`, null, { params: { archived } });
};

// ═══════════════════════════════════════════════════════════════
// STUBS — endpoint KHÔNG có trong ChatController ECMS
// (cần tìm controller khác hoặc bỏ khỏi ChatWidget)
// ═══════════════════════════════════════════════════════════════
export const getTeachers = async (): Promise<TeacherContact[]> => {
  // TODO: BE ECMS chưa có endpoint này
  console.warn('[chatService] getTeachers — endpoint chưa tồn tại ở BE');
  return [];
};

export const getMyCoursesForChat = async (): Promise<CourseContact[]> => {
  // TODO: BE ECMS chưa có endpoint này
  console.warn('[chatService] getMyCoursesForChat — endpoint chưa tồn tại ở BE');
  return [];
};

// Alias
export const chatApi = {
  getMyConversations,
  getConversationById,
  createConversation,
  createPrivateConversation,
  updateConversationName,
  updateMessagePermission,
  getParticipants,
  addParticipants,
  removeParticipant,
  updateParticipantRole,
  muteParticipant,
  unmuteParticipant,
  banParticipant,
  unbanParticipant,
  transferOwnership,
  getMessages,
  sendMessage,
  markAsRead,
  editMessage,
  deleteMessage,
  searchUsers,
  pinConversation,
  muteConversationByUser,
  archiveConversation,
  getTeachers,
  getMyCoursesForChat,
};