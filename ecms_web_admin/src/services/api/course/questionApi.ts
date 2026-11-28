import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../../types/api';
import type {
  QuestionResponse,
  QuestionCreateRequest,
  QuestionImportResult,
} from '../../types/course';

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

  importExcel: async (
    courseId: number, file: File,
  ): Promise<QuestionImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<RequestResponse<QuestionImportResult>>(
      API_ENDPOINT.QUESTIONS_IMPORT(courseId),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  },

  downloadImportTemplate: async (courseId: number): Promise<void> => {
    const { data } = await api.get<Blob>(
      API_ENDPOINT.QUESTIONS_IMPORT_TEMPLATE(courseId),
      { responseType: 'blob' },
    );
    const blob = new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'question_import_template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};