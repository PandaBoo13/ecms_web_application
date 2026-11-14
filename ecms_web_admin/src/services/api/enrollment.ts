import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type {
  AttendanceRecordResponse,
  AttendanceStatus,
  EnrollmentBatchActionResponse,
  EnrollmentResponse,
  EnrollmentSummaryResponse,
  EnrollmentStatusLogResponse,
  PendingEnrollmentBatchResponse,
  PendingEnrollmentCandidate,
  FinalScoreRequest,
  HoldRequest,
  ReasonRequest,
  SessionAttendanceResponse,
} from '../types/enrollment';

export const enrollmentApi = {
  summary: async () =>
    (await api.get<RequestResponse<EnrollmentSummaryResponse>>(API_ENDPOINT.ENROLLMENT_SUMMARY)).data.data,
  createOffline: async (invoiceId: number) =>
    (await api.post<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_OFFLINE, { invoiceId })).data.data,
  createPendingBatch: async (invoiceIds: number[]) =>
    (await api.post<RequestResponse<PendingEnrollmentBatchResponse>>(
      API_ENDPOINT.ENROLLMENT_PENDING_BULK, { invoiceIds },
    )).data.data,
  pendingCandidates: async (params: Record<string, unknown> = {}) =>
    (await api.get<RequestResponse<PageResponse<PendingEnrollmentCandidate>>>(
      API_ENDPOINT.ENROLLMENT_PENDING_ELIGIBLE, { params },
    )).data.data,
  search: async (params: Record<string, unknown>) =>
    (await api.get<RequestResponse<PageResponse<EnrollmentResponse>>>(API_ENDPOINT.ENROLLMENTS, { params })).data.data,
  get: async (id: number) =>
    (await api.get<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_DETAIL(id))).data.data,
  reserve: async (id: number, body: HoldRequest) =>
    (await api.post<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_RESERVE(id), body)).data.data,
  resume: async (id: number) =>
    (await api.post<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_RESUME(id))).data.data,
  terminate: async (id: number, body: ReasonRequest) =>
    (await api.post<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_TERMINATE(id), body)).data.data,
  recordFinalScore: async (id: number, body: FinalScoreRequest) =>
    (await api.put<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_FINAL_SCORE(id), body)).data.data,
  complete: async (id: number) =>
    (await api.post<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_COMPLETE(id))).data.data,
  completeBatch: async (courseId: number, enrollmentIds: number[]) =>
    (await api.post<RequestResponse<EnrollmentBatchActionResponse>>(
      API_ENDPOINT.ENROLLMENT_COMPLETE_BULK, { courseId, enrollmentIds },
    )).data.data,
  attendanceHistory: async (id: number) =>
    (await api.get<RequestResponse<AttendanceRecordResponse[]>>(API_ENDPOINT.ENROLLMENT_ATTENDANCE_HISTORY(id))).data.data,
  statusHistory: async (id: number) =>
    (await api.get<RequestResponse<EnrollmentStatusLogResponse[]>>(API_ENDPOINT.ENROLLMENT_STATUS_HISTORY(id))).data.data,
  sessionAttendance: async (courseId: number, sessionId: number) =>
    (await api.get<RequestResponse<SessionAttendanceResponse>>(API_ENDPOINT.SESSION_ATTENDANCE(courseId, sessionId))).data.data,
  saveSessionAttendance: async (courseId: number, sessionId: number, records: {
    enrollmentId: number; status: AttendanceStatus; checkInAt?: string | null; note?: string | null;
  }[]) =>
    (await api.put<RequestResponse<SessionAttendanceResponse>>(
      API_ENDPOINT.SESSION_ATTENDANCE(courseId, sessionId), { records },
    )).data.data,
};
