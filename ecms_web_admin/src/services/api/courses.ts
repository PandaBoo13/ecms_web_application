import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../types/api';
import type {
  CourseResponse,
  CourseDetailResponse,
  CourseCreateRequest,
  CourseUpdateRequest,
  CourseResourceResponse,
  SessionResponse,
  QuestionResponse,
  CategoryResponse,
  RoomResponse,
} from '../types/course';

export const courseApi = {
  search: async (params: Record<string, unknown>): Promise<PageResponse<CourseResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<CourseResponse>>>(
      API_ENDPOINT.COURSES,
      { params }
    );
    return data.data;
  },

  getById: async (id: number): Promise<CourseDetailResponse> => {
    const { data } = await api.get<RequestResponse<CourseDetailResponse>>(
      API_ENDPOINT.COURSE_DETAIL(id)
    );
    return data.data;
  },

  create: async (payload: CourseCreateRequest): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSES,
      payload
    );
    return data.data;
  },

  update: async (id: number, payload: CourseUpdateRequest): Promise<CourseResponse> => {
    const { data } = await api.put<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_DETAIL(id),
      payload
    );
    return data.data;
  },

  submitReview: async (id: number): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_SUBMIT_REVIEW(id)
    );
    return data.data;
  },

  review: async (id: number, approved: boolean, rejectReason?: string): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_REVIEW(id),
      { approved, rejectReason }
    );
    return data.data;
  },

  archive: async (id: number): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(API_ENDPOINT.COURSE_ARCHIVE(id));
    return data.data;
  },

  cancel: async (id: number, reason: string): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_CANCEL(id),
      null,
      { params: { reason } }
    );
    return data.data;
  },

  softDelete: async (id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.COURSE_DETAIL(id));
  },
};

export const resourceApi = {
  getTree: async (courseId: number): Promise<CourseResourceResponse[]> => {
    const { data } = await api.get<RequestResponse<CourseResourceResponse[]>>(
      API_ENDPOINT.RESOURCE_TREE(courseId)
    );
    return data.data;
  },
  getById: async (courseId: number, id: number): Promise<CourseResourceResponse> => {
    const { data } = await api.get<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCE_DETAIL(courseId, id)
    );
    return data.data;
  },
  create: async (courseId: number, payload: Partial<CourseResourceResponse>): Promise<CourseResourceResponse> => {
    const { data } = await api.post<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCES(courseId),
      payload
    );
    return data.data;
  },
  update: async (courseId: number, id: number, payload: Partial<CourseResourceResponse>): Promise<CourseResourceResponse> => {
    const { data } = await api.put<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCE_DETAIL(courseId, id),
      payload
    );
    return data.data;
  },
  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.RESOURCE_DETAIL(courseId, id));
  },
};

export const sessionApi = {
  list: async (courseId: number): Promise<SessionResponse[]> => {
    const { data } = await api.get<RequestResponse<SessionResponse[]>>(
      API_ENDPOINT.SESSIONS(courseId)
    );
    return data.data;
  },
  create: async (courseId: number, payload: Partial<SessionResponse>): Promise<SessionResponse> => {
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSIONS(courseId),
      payload
    );
    return data.data;
  },
  cancel: async (courseId: number, id: number, reason: string): Promise<SessionResponse> => {
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_CANCEL(courseId, id),
      { reason }
    );
    return data.data;
  },
};

export const questionApi = {
  search: async (courseId: number, params?: Record<string, unknown>): Promise<PageResponse<QuestionResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<QuestionResponse>>>(
      API_ENDPOINT.QUESTIONS(courseId),
      { params }
    );
    return data.data;
  },
  create: async (courseId: number, payload: Partial<QuestionResponse>): Promise<QuestionResponse> => {
    const { data } = await api.post<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTIONS(courseId),
      payload
    );
    return data.data;
  },
  update: async (courseId: number, id: number, payload: Partial<QuestionResponse>): Promise<QuestionResponse> => {
    const { data } = await api.put<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTION_DETAIL(courseId, id),
      payload
    );
    return data.data;
  },
  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.QUESTION_DETAIL(courseId, id));
  },
};

export const categoryApi = {
  list: async (params?: Record<string, unknown>): Promise<PageResponse<CategoryResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<CategoryResponse>>>(
      API_ENDPOINT.CATEGORIES,
      { params }
    );
    return data.data;
  },
  tree: async (): Promise<CategoryResponse[]> => {
    const { data } = await api.get<RequestResponse<CategoryResponse[]>>(API_ENDPOINT.CATEGORY_TREE);
    return data.data;
  },
};

export const roomApi = {
  listActive: async (): Promise<RoomResponse[]> => {
    const { data } = await api.get<RequestResponse<RoomResponse[]>>(API_ENDPOINT.ROOMS_ACTIVE);
    return data.data;
  },
  listAll: async (): Promise<RoomResponse[]> => {
    const { data } = await api.get<RequestResponse<RoomResponse[]>>(API_ENDPOINT.ROOMS);
    return data.data;
  },
};