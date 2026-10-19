// src/services/api/courses.ts
import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { RequestResponse, PageResponse } from '../types/api';
import type {
  CourseResponse,
  CourseDetailResponse,
  CourseCreateRequest,
  CourseUpdateRequest,
  CourseOfflineInfoRequest,
  CourseReviewRequest,
  CourseCopyRequest,
  CourseResourceResponse,
  ResourceTreeResponse,
  ResourceCreateRequest,
  ResourceUpdateRequest,
  SessionResponse,
  SessionCreateRequest,
  SessionCancelRequest,
  SessionGenerationResult,
  QuestionResponse,
  QuestionCreateRequest,
  CategoryResponse,
  RoomResponse,
  QuizResponse,
  QuizDetailResponse,
  QuizCreateRequest,
  QuizSubmitRequest,
  QuizAttemptResponse,
  ProgressResponse,
} from '../types/course';

// ═══════════════════════════════════════════════════════════════
// COURSE
// ═══════════════════════════════════════════════════════════════
export const courseApi = {
  search: async (params: Record<string, unknown>): Promise<PageResponse<CourseResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<CourseResponse>>>(
      API_ENDPOINT.COURSES,
      { params },
    );
    return data.data;
  },

  getById: async (id: number): Promise<CourseDetailResponse> => {
    const { data } = await api.get<RequestResponse<CourseDetailResponse>>(
      API_ENDPOINT.COURSE_DETAIL(id),
    );
    return data.data;
  },

  create: async (payload: CourseCreateRequest): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSES,
      payload,
    );
    return data.data;
  },

  update: async (id: number, payload: CourseUpdateRequest): Promise<CourseResponse> => {
    const { data } = await api.put<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_DETAIL(id),
      payload,
    );
    return data.data;
  },

  updateOfflineInfo: async (
    id: number,
    payload: CourseOfflineInfoRequest,
  ): Promise<CourseResponse> => {
    const { data } = await api.put<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_OFFLINE_INFO(id),
      payload,
    );
    return data.data;
  },

  submitReview: async (id: number): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_SUBMIT_REVIEW(id),
    );
    return data.data;
  },

  review: async (
    id: number,
    approved: boolean,
    rejectReason?: string,
  ): Promise<CourseResponse> => {
    const body: CourseReviewRequest = { approved, rejectReason };
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_REVIEW(id),
      body,
    );
    return data.data;
  },

  archive: async (id: number): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_ARCHIVE(id),
    );
    return data.data;
  },

  cancel: async (id: number, reason: string): Promise<CourseResponse> => {
    const { data } = await api.post<RequestResponse<CourseResponse>>(
      API_ENDPOINT.COURSE_CANCEL(id),
      null,
      { params: { reason } },
    );
    return data.data;
  },

  copy: async (
    sourceId: number,
    payload: CourseCopyRequest,
  ): Promise<CourseDetailResponse> => {
    const { data } = await api.post<RequestResponse<CourseDetailResponse>>(
      API_ENDPOINT.COURSE_COPY(sourceId),
      payload,
    );
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
      API_ENDPOINT.COURSE_CHANGE_TEACHER(id),
      null,
      { params: { teacherId } },
    );
    return data.data;
  },
};

// ═══════════════════════════════════════════════════════════════
// RESOURCE
// ═══════════════════════════════════════════════════════════════
export const resourceApi = {
  getTree: async (courseId: number): Promise<ResourceTreeResponse[]> => {
    const { data } = await api.get<RequestResponse<ResourceTreeResponse[]>>(
      API_ENDPOINT.RESOURCE_TREE(courseId),
    );
    return data.data;
  },

  getById: async (courseId: number, id: number): Promise<CourseResourceResponse> => {
    const { data } = await api.get<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCE_DETAIL(courseId, id),
    );
    return data.data;
  },

  create: async (
    courseId: number,
    payload: ResourceCreateRequest,
  ): Promise<CourseResourceResponse> => {
    const { data } = await api.post<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCES(courseId),
      payload,
    );
    return data.data;
  },

  update: async (
    courseId: number,
    id: number,
    payload: ResourceUpdateRequest,
  ): Promise<CourseResourceResponse> => {
    const { data } = await api.put<RequestResponse<CourseResourceResponse>>(
      API_ENDPOINT.RESOURCE_DETAIL(courseId, id),
      payload,
    );
    return data.data;
  },

  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.RESOURCE_DETAIL(courseId, id));
  },
};

// ═══════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════
export const sessionApi = {
  list: async (courseId: number): Promise<SessionResponse[]> => {
    const { data } = await api.get<RequestResponse<SessionResponse[]>>(
      API_ENDPOINT.SESSIONS(courseId),
    );
    return data.data;
  },

  getById: async (courseId: number, id: number): Promise<SessionResponse> => {
    const { data } = await api.get<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_DETAIL(courseId, id),
    );
    return data.data;
  },

  create: async (
    courseId: number,
    payload: SessionCreateRequest,
  ): Promise<SessionResponse> => {
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSIONS(courseId),
      payload,
    );
    return data.data;
  },

  cancel: async (
    courseId: number,
    id: number,
    reason: string,
  ): Promise<SessionResponse> => {
    const body: SessionCancelRequest = { reason };
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_CANCEL(courseId, id),
      body,
    );
    return data.data;
  },

  generate: async (courseId: number): Promise<SessionGenerationResult> => {
    const { data } = await api.post<RequestResponse<SessionGenerationResult>>(
      API_ENDPOINT.SESSION_GENERATE(courseId),
    );
    return data.data;
  },

  markDone: async (courseId: number, id: number): Promise<SessionResponse> => {
    const { data } = await api.post<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_DONE(courseId, id),
    );
    return data.data;
  },

  assignSubstituteTeacher: async (
    courseId: number,
    id: number,
    teacherId: number | null,
  ): Promise<SessionResponse> => {
    const { data } = await api.patch<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_SUBSTITUTE_TEACHER(courseId, id),
      null,
      { params: { teacherId } },
    );
    return data.data;
  },

  assignAssistant: async (
    courseId: number,
    id: number,
    assistantId: number | null,
  ): Promise<SessionResponse> => {
    const { data } = await api.patch<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_ASSISTANT(courseId, id),
      null,
      { params: { assistantId } },
    );
    return data.data;
  },

  /** @deprecated Dùng assignSubstituteTeacher */
  assignTeacher: async (
    courseId: number,
    id: number,
    teacherId: number | null,
  ): Promise<SessionResponse> => {
    const { data } = await api.patch<RequestResponse<SessionResponse>>(
      API_ENDPOINT.SESSION_TEACHER(courseId, id),
      null,
      { params: { teacherId } },
    );
    return data.data;
  },
};

// ═══════════════════════════════════════════════════════════════
// QUESTION
// ═══════════════════════════════════════════════════════════════
export const questionApi = {
  search: async (
    courseId: number,
    params?: Record<string, unknown>,
  ): Promise<PageResponse<QuestionResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<QuestionResponse>>>(
      API_ENDPOINT.QUESTIONS(courseId),
      { params },
    );
    return data.data;
  },

  getById: async (courseId: number, id: number): Promise<QuestionResponse> => {
    const { data } = await api.get<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTION_DETAIL(courseId, id),
    );
    return data.data;
  },

  create: async (
    courseId: number,
    payload: QuestionCreateRequest,
  ): Promise<QuestionResponse> => {
    const { data } = await api.post<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTIONS(courseId),
      payload,
    );
    return data.data;
  },

  update: async (
    courseId: number,
    id: number,
    payload: QuestionCreateRequest,
  ): Promise<QuestionResponse> => {
    const { data } = await api.put<RequestResponse<QuestionResponse>>(
      API_ENDPOINT.QUESTION_DETAIL(courseId, id),
      payload,
    );
    return data.data;
  },

  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.QUESTION_DETAIL(courseId, id));
  },
};

// ═══════════════════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════════════════
export const quizApi = {
  list: async (courseId: number): Promise<QuizResponse[]> => {
    const { data } = await api.get<RequestResponse<QuizResponse[]>>(
      API_ENDPOINT.QUIZZES(courseId),
    );
    return data.data;
  },

  getDetail: async (courseId: number, id: number): Promise<QuizDetailResponse> => {
    const { data } = await api.get<RequestResponse<QuizDetailResponse>>(
      API_ENDPOINT.QUIZ_DETAIL(courseId, id),
    );
    return data.data;
  },

  create: async (
    courseId: number,
    payload: QuizCreateRequest,
  ): Promise<QuizResponse> => {
    const { data } = await api.post<RequestResponse<QuizResponse>>(
      API_ENDPOINT.QUIZZES(courseId),
      payload,
    );
    return data.data;
  },

  update: async (
    courseId: number,
    id: number,
    payload: QuizCreateRequest,
  ): Promise<QuizResponse> => {
    const { data } = await api.put<RequestResponse<QuizResponse>>(
      API_ENDPOINT.QUIZ_DETAIL(courseId, id),
      payload,
    );
    return data.data;
  },

  delete: async (courseId: number, id: number): Promise<void> => {
    await api.delete(API_ENDPOINT.QUIZ_DETAIL(courseId, id));
  },

  startAttempt: async (courseId: number, id: number): Promise<QuizAttemptResponse> => {
    const { data } = await api.post<RequestResponse<QuizAttemptResponse>>(
      API_ENDPOINT.QUIZ_START(courseId, id),
    );
    return data.data;
  },

  submitAttempt: async (
    courseId: number,
    id: number,
    attemptId: number,
    answers: Record<string, unknown>,
  ): Promise<QuizAttemptResponse> => {
    const body: QuizSubmitRequest = {
      attemptId,
      answers: JSON.stringify(answers),
    };
    const { data } = await api.post<RequestResponse<QuizAttemptResponse>>(
      API_ENDPOINT.QUIZ_SUBMIT(courseId, id),
      body,
    );
    return data.data;
  },

  getMyAttempts: async (
    courseId: number,
    id: number,
  ): Promise<QuizAttemptResponse[]> => {
    const { data } = await api.get<RequestResponse<QuizAttemptResponse[]>>(
      API_ENDPOINT.QUIZ_ATTEMPTS(courseId, id),
    );
    return data.data;
  },

  getAttemptDetail: async (
    courseId: number,
    id: number,
    attemptId: number,
  ): Promise<QuizAttemptResponse> => {
    const { data } = await api.get<RequestResponse<QuizAttemptResponse>>(
      API_ENDPOINT.QUIZ_ATTEMPT_DETAIL(courseId, id, attemptId),
    );
    return data.data;
  },
};

// ═══════════════════════════════════════════════════════════════
// CATEGORY / ROOM
// ═══════════════════════════════════════════════════════════════
export const categoryApi = {
  list: async (
    params?: Record<string, unknown>,
  ): Promise<PageResponse<CategoryResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<CategoryResponse>>>(
      API_ENDPOINT.CATEGORIES,
      { params },
    );
    return data.data;
  },
  tree: async (): Promise<CategoryResponse[]> => {
    const { data } = await api.get<RequestResponse<CategoryResponse[]>>(
      API_ENDPOINT.CATEGORY_TREE,
    );
    return data.data;
  },
};

export const roomApi = {
  listActive: async (): Promise<RoomResponse[]> => {
    const { data } = await api.get<RequestResponse<RoomResponse[]>>(
      API_ENDPOINT.ROOMS_ACTIVE,
    );
    return data.data;
  },
  listAll: async (): Promise<RoomResponse[]> => {
    const { data } = await api.get<RequestResponse<RoomResponse[]>>(
      API_ENDPOINT.ROOMS,
    );
    return data.data;
  },
};

// ═══════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════
export const progressApi = {
  getMyCourses: async (
    params?: Record<string, unknown>,
  ): Promise<PageResponse<ProgressResponse>> => {
    const { data } = await api.get<RequestResponse<PageResponse<ProgressResponse>>>(
      API_ENDPOINT.PROGRESS_MY_COURSES,
      { params },
    );
    return data.data;
  },

  getMyCourseProgress: async (courseId: number): Promise<ProgressResponse> => {
    const { data } = await api.get<RequestResponse<ProgressResponse>>(
      API_ENDPOINT.PROGRESS_COURSE(courseId),
    );
    return data.data;
  },

  getResourceProgresses: async (courseId: number): Promise<ProgressResponse[]> => {
    const { data } = await api.get<RequestResponse<ProgressResponse[]>>(
      API_ENDPOINT.PROGRESS_RESOURCES(courseId),
    );
    return data.data;
  },

  updateResourceProgress: async (
    resourceId: number,
    percentage?: number,
    timeSpentSeconds?: number,
  ): Promise<ProgressResponse> => {
    const { data } = await api.patch<RequestResponse<ProgressResponse>>(
      API_ENDPOINT.PROGRESS_UPDATE_RESOURCE(resourceId),
      null,
      { params: { percentage, timeSpentSeconds } },
    );
    return data.data;
  },

  markResourceCompleted: async (resourceId: number): Promise<ProgressResponse> => {
    const { data } = await api.post<RequestResponse<ProgressResponse>>(
      API_ENDPOINT.PROGRESS_COMPLETE_RESOURCE(resourceId),
    );
    return data.data;
  },
};