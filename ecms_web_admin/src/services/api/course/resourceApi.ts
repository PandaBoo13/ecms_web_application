// src/services/course/resourceApi.ts
import api from '../axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse } from '../../types/api';
import type {
  CourseResourceResponse,
  ResourceTreeResponse,
  ResourceCreateRequest,
  ResourceUpdateRequest,
} from '../../types/course';

export const resourceApi = {
  getTree: async (courseId: number): Promise<ResourceTreeResponse[]> => {
    const { data } = await api.get<RequestResponse<ResourceTreeResponse[]>>(
      API_ENDPOINT.RESOURCE_TREE(courseId));
    return data.data;
  },

  getById: async (courseId: number, id: number): Promise<CourseResourceResponse> => {
    const { data } = await api.get<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCE_DETAIL(courseId, id));
    return data.data;
  },

  create: async (
    courseId: number, payload: ResourceCreateRequest,
  ): Promise<CourseResourceResponse> => {
    const { data } = await api.post<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCES(courseId), payload);
    return data.data;
  },

  update: async (
    courseId: number, id: number, payload: ResourceUpdateRequest,
  ): Promise<CourseResourceResponse> => {
    const { data } = await api.put<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCE_DETAIL(courseId, id), payload);
    return data.data;
  },

  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.RESOURCE_DETAIL(courseId, id));
  },

  reorder: async (
    courseId: number, items: { id: number; orderIndex: number }[],
  ): Promise<void> => {
    await api.put(API_ENDPOINT.RESOURCE_REORDER(courseId), { items });
  },
};