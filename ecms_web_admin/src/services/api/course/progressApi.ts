// src/services/course/progressApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../../types/api';
import type { ProgressResponse, ProgressUpdateRequest } from '../../types/course/progress';

export const progressApi = {
  getMyCourses: async (
    params?: Record<string, unknown>,
  ): Promise<PageResponse<ProgressResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<ProgressResponse>>>(
      API_ENDPOINT.PROGRESS_MY_COURSES, { params });
    return data.data;
  },

  getMyCourseProgress: async (courseId: number): Promise<ProgressResponse> => {
    const { data } = await api.get<RequestResponse<ProgressResponse>>(
      API_ENDPOINT.PROGRESS_COURSE(courseId));
    return data.data;
  },

  getResourceProgresses: async (courseId: number): Promise<ProgressResponse[]> => {
    const { data } = await api.get<RequestResponse<ProgressResponse[]>>(
      API_ENDPOINT.PROGRESS_RESOURCES(courseId));
    return data.data;
  },

  updateResourceProgress: async (
    resourceId: number, payload: ProgressUpdateRequest,
  ): Promise<ProgressResponse> => {
    const { data } = await api.patch<RequestResponse<ProgressResponse>>(
      API_ENDPOINT.PROGRESS_UPDATE_RESOURCE(resourceId), payload);
    return data.data;
  },

  markResourceCompleted: async (resourceId: number): Promise<ProgressResponse> => {
    const { data } = await api.post<RequestResponse<ProgressResponse>>(
      API_ENDPOINT.PROGRESS_COMPLETE_RESOURCE(resourceId));
    return data.data;
  },
};