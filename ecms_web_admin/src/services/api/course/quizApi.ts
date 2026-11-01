// src/services/course/quizApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../../types/api';
import type {
  QuizResponse,
  QuizDetailResponse,
  QuizCreateRequest,
  QuizSubmitRequest,
  QuizAttemptResponse,
} from '../../types/course';

export const quizApi = {
  list: async (courseId: number): Promise<QuizResponse[]> => {
    const { data } = await api.get<RequestResponse<QuizResponse[]>>(
      API_ENDPOINT.QUIZZES(courseId));
    return data.data;
  },

  getDetail: async (courseId: number, id: number): Promise<QuizDetailResponse> => {
    const { data } = await api.get<RequestResponse<QuizDetailResponse>>(
      API_ENDPOINT.QUIZ_DETAIL(courseId, id));
    return data.data;
  },

  create: async (courseId: number, payload: QuizCreateRequest): Promise<QuizResponse> => {
    const { data } = await api.post<RequestResponse<QuizResponse>>(
      API_ENDPOINT.QUIZZES(courseId), payload);
    return data.data;
  },

  update: async (
    courseId: number, id: number, payload: QuizCreateRequest,
  ): Promise<QuizResponse> => {
    const { data } = await api.put<RequestResponse<QuizResponse>>(
      API_ENDPOINT.QUIZ_DETAIL(courseId, id), payload);
    return data.data;
  },

  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.QUIZ_DETAIL(courseId, id));
  },

  startAttempt: async (courseId: number, id: number): Promise<QuizAttemptResponse> => {
    const { data } = await api.post<RequestResponse<QuizAttemptResponse>>(
      API_ENDPOINT.QUIZ_START(courseId, id));
    return data.data;
  },

  submitAttempt: async (
    courseId: number, id: number, attemptId: number,
    answers: Record<string, unknown>,
  ): Promise<QuizAttemptResponse> => {
    const body: QuizSubmitRequest = { attemptId, answers: JSON.stringify(answers) };
    const { data } = await api.post<RequestResponse<QuizAttemptResponse>>(
      API_ENDPOINT.QUIZ_SUBMIT(courseId, id), body);
    return data.data;
  },

  getMyAttempts: async (courseId: number, id: number): Promise<QuizAttemptResponse[]> => {
    const { data } = await api.get<RequestResponse<QuizAttemptResponse[]>>(
      API_ENDPOINT.QUIZ_ATTEMPTS(courseId, id));
    return data.data;
  },

  getAttemptDetail: async (
    courseId: number, id: number, attemptId: number,
  ): Promise<QuizAttemptResponse> => {
    const { data } = await api.get<RequestResponse<QuizAttemptResponse>>(
      API_ENDPOINT.QUIZ_ATTEMPT_DETAIL(courseId, id, attemptId));
    return data.data;
  },
};