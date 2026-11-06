// src/services/course/courseApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../../types/api';
import type {
  CourseResponse,
  CourseDetailResponse,
  CourseCreateRequest,
  CourseUpdateRequest,
  CourseOfflineInfoRequest,
  CourseReviewRequest,
  CourseCopyRequest,
} from '../../types/course';

export const courseApi = {
  search: async (params: Record<string, unknown>): Promise<PageResponse<CourseResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<CourseResponse>>>(
      API_ENDPOINT.COURSES, { params });
    return data.data;
  },

  getById: async (id: number): Promise<CourseDetailResponse> => {
    const { data } = await api.get<RequestResponse<CourseDetailResponse>>(
      API_ENDPOINT.COURSE_DETAIL(id));
    return data.data;
  },

  create: async (payload: CourseCreateRequest): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSES, payload);
    return data.data;
  },

  update: async (id: number, payload: CourseUpdateRequest): Promise<CourseResponse> => {
    const { data } = await api.put<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_DETAIL(id), payload);
    return data.data;
  },

  // ⚠️ ĐÃ SỬA: Thêm Partial<CourseOfflineInfoRequest> để hỗ trợ update từng field
  updateOfflineInfo: async (
    id: number, 
    payload: Partial<CourseOfflineInfoRequest>, 
  ): Promise<CourseResponse> => {
    const { data } = await api.put<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_OFFLINE_INFO(id), payload);
    return data.data;
  },

  submitReview: async (id: number): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_SUBMIT_REVIEW(id));
    return data.data;
  },

  review: async (
    id: number, approved: boolean, rejectReason?: string,
  ): Promise<CourseResponse> => {
    const body: CourseReviewRequest = { approved, rejectReason };
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_REVIEW(id), body);
    return data.data;
  },

  archive: async (id: number): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_ARCHIVE(id));
    return data.data;
  },

  cancel: async (id: number, reason: string): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_CANCEL(id), null, { params: { reason } });
    return data.data;
  },

  copy: async (
    sourceId: number, payload: CourseCopyRequest,
  ): Promise<CourseDetailResponse> => {
    const { data } = await api.post<RequestResponse<CourseDetailResponse>>(
      API_ENDPOINT.COURSE_COPY(sourceId), payload);
    return data.data;
  },

  softDelete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.COURSE_DETAIL(id));
  },

  hardDelete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.COURSE_HARD_DELETE(id));
  },

  changeTeacher: async (id: number, teacherId: number): Promise<CourseResponse> => {
    const { data } = await api.patch<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_CHANGE_TEACHER(id), null, { params: { teacherId } });
    return data.data;
  },
};