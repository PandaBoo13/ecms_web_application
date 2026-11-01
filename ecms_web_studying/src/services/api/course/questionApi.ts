// src/services/course/questionApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../../types/api';
import type { QuestionResponse, QuestionCreateRequest } from '../../types/course';

export const questionApi = {
  search: async (
    courseId: number, params?: Record<string, unknown>,
  ): Promise<PageResponse<QuestionResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<QuestionResponse>>>(
      API_ENDPOINT.QUESTIONS(courseId), { params });
    return data.data;
  },

  getById: async (courseId: number, id: number): Promise<QuestionResponse> => {
    const { data } = await api.get<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTION_DETAIL(courseId, id));
    return data.data;
  },

  create: async (
    courseId: number, payload: QuestionCreateRequest,
  ): Promise<QuestionResponse> => {
    const { data } = await api.post<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTIONS(courseId), payload);
    return data.data;
  },

  update: async (
    courseId: number, id: number, payload: QuestionCreateRequest,
  ): Promise<QuestionResponse> => {
    const { data } = await api.put<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTION_DETAIL(courseId, id), payload);
    return data.data;
  },

  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.QUESTION_DETAIL(courseId, id));
  },
};