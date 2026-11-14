// src/services/course/sessionApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../../types/api';
import type {
  SessionResponse,
  SessionCreateRequest,
  SessionCancelRequest,
  SessionGenerationResult,
} from '../../types/course';

export const sessionApi = {
  list: async (courseId: number): Promise<SessionResponse[]> => {
    const { data } = await api.get<RequestResponse<SessionResponse[]>>(
      API_ENDPOINT.SESSIONS(courseId));
    return data.data;
  },

  getById: async (courseId: number, id: number): Promise<SessionResponse> => {
    const { data } = await api.get<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_DETAIL(courseId, id));
    return data.data;
  },

  create: async (
    courseId: number, payload: SessionCreateRequest,
  ): Promise<SessionResponse> => {
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSIONS(courseId), payload);
    return data.data;
  },

  cancel: async (
    courseId: number, id: number, reason: string,
  ): Promise<SessionResponse> => {
    const body: SessionCancelRequest = { reason };
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_CANCEL(courseId, id), body);
    return data.data;
  },

  /** Xoá vĩnh viễn buổi học (BE không cho xoá buổi đã COMPLETED). */
  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.SESSION_DETAIL(courseId, id));
  },

  generate: async (courseId: number): Promise<SessionGenerationResult> => {
    const { data } = await api.post<RequestResponse<SessionGenerationResult>>(
      API_ENDPOINT.SESSION_GENERATE(courseId));
    return data.data;
  },

  markDone: async (courseId: number, id: number): Promise<SessionResponse> => {
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_DONE(courseId, id));
    return data.data;
  },

  assignSubstituteTeacher: async (
    courseId: number, id: number, teacherId: number | null,
  ): Promise<SessionResponse> => {
    const { data } = await api.patch<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_SUBSTITUTE_TEACHER(courseId, id),
      null, { params: { teacherId } });
    return data.data;
  },

  assignAssistant: async (
    courseId: number, id: number, assistantId: number | null,
  ): Promise<SessionResponse> => {
    const { data } = await api.patch<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_ASSISTANT(courseId, id),
      null, { params: { assistantId } });
    return data.data;
  },

  /** @deprecated BE đã đánh dấu deprecated. Dùng assignSubstituteTeacher. */
  assignTeacher: async (
    courseId: number, id: number, teacherId: number | null,
  ): Promise<SessionResponse> => {
    const { data } = await api.patch<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_TEACHER(courseId, id),
      null, { params: { teacherId } });
    return data.data;
  },

  // Thêm vào trong object sessionApi:
getMySchedule: async (params: { from?: string; to?: string }): Promise<any[]> => {
  const { data } = await api.get<RequestResponse<any[]>>(
    API_ENDPOINT.SESSION_MY_SCHEDULE, { params }
  );
  return data.data;
},
};