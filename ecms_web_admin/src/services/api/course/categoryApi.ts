// src/services/course/categoryApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../../types/api';
import type {
  CategoryResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
} from '../../types/course/category';

export const categoryApi = {
  list: async (
    params?: Record<string, unknown>,
  ): Promise<PageResponse<CategoryResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<CategoryResponse>>>(
      API_ENDPOINT.CATEGORIES, { params });
    return data.data;
  },

  tree: async (): Promise<CategoryResponse[]> => {
    const { data } = await api.get<RequestResponse<CategoryResponse[]>>(
      API_ENDPOINT.CATEGORY_TREE);
    return data.data;
  },

  getById: async (id: number): Promise<CategoryResponse> => {
    const { data } = await api.get<RequestResponse<CategoryResponse>>(
      API_ENDPOINT.CATEGORY_DETAIL(id));
    return data.data;
  },

  create: async (payload: CategoryCreateRequest): Promise<CategoryResponse> => {
    const { data } = await api.post<RequestResponse<CategoryResponse>>(
      API_ENDPOINT.CATEGORIES, payload);
    return data.data;
  },

  update: async (
    id: number, payload: CategoryUpdateRequest,
  ): Promise<CategoryResponse> => {
    const { data } = await api.put<RequestResponse<CategoryResponse>>(
      API_ENDPOINT.CATEGORY_DETAIL(id), payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.CATEGORY_DETAIL(id));
  },
};