import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type {
  AttendanceAuditLogResponse,
  AttendanceMatrixResponse,
  InstructorAttendanceCourse,
  AttendanceRecordResponse,
  AttendanceStatus,
  InstructorAttendanceSession,
  EnrollmentBatchActionResponse,
  GradeReviewStatusResponse,
  FinalScoreImportResponse,
  EnrollmentResponse,
  EnrollmentSummaryResponse,
  EnrollmentStatusLogResponse,
  FinalScoreRequest,
  HoldRequest,
  ReasonRequest,
  SessionAttendanceResponse,
} from '../types/enrollment';

export const enrollmentApi = {
  summary: async () =>
    (await api.get<RequestResponse<EnrollmentSummaryResponse>>(API_ENDPOINT.ENROLLMENT_SUMMARY)).data.data,
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
  complete: async (id: number, result: 'PASSED' | 'FAILED') =>
    (await api.post<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_COMPLETE(id), { result })).data.data,
  completeBatch: async (courseId: number, enrollmentIds: number[], result: 'PASSED' | 'FAILED') =>
    (await api.post<RequestResponse<EnrollmentBatchActionResponse>>(
      API_ENDPOINT.ENROLLMENT_COMPLETE_BULK, { courseId, enrollmentIds, result },
    )).data.data,
  exportCourseRoster: async (courseId: number) =>
    (await api.get<Blob>(API_ENDPOINT.ENROLLMENT_COURSE_ROSTER_EXPORT(courseId), { responseType: 'blob' })).data,
  importFinalScores: async (courseId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return (await api.post<RequestResponse<FinalScoreImportResponse>>(
      API_ENDPOINT.ENROLLMENT_FINAL_SCORES_IMPORT(courseId), form,
    )).data.data;
  },
  getGradeReviewStatus: async (courseId: number) =>
    (await api.get<RequestResponse<GradeReviewStatusResponse>>(
      API_ENDPOINT.ENROLLMENT_GRADE_REVIEW_STATUS(courseId),
    )).data.data,
  submitGradeReview: async (courseId: number) =>
    (await api.post<RequestResponse<GradeReviewStatusResponse>>(
      API_ENDPOINT.ENROLLMENT_GRADE_REVIEW_SUBMIT(courseId),
    )).data.data,
  attendanceHistory: async (id: number) =>
    (await api.get<RequestResponse<AttendanceRecordResponse[]>>(API_ENDPOINT.ENROLLMENT_ATTENDANCE_HISTORY(id))).data.data,
  instructorAttendanceSessions: async (from: string, to: string) =>
    (await api.get<RequestResponse<InstructorAttendanceSession[]>>(
      API_ENDPOINT.INSTRUCTOR_ATTENDANCE_SESSIONS, { params: { from, to } },
    )).data.data,
  instructorAttendanceCourses: async () =>
    (await api.get<RequestResponse<InstructorAttendanceCourse[]>>(
      API_ENDPOINT.INSTRUCTOR_ATTENDANCE_COURSES,
    )).data.data,
  statusHistory: async (id: number) =>
    (await api.get<RequestResponse<EnrollmentStatusLogResponse[]>>(API_ENDPOINT.ENROLLMENT_STATUS_HISTORY(id))).data.data,
  sessionAttendance: async (courseId: number, sessionId: number) =>
    (await api.get<RequestResponse<SessionAttendanceResponse>>(API_ENDPOINT.SESSION_ATTENDANCE(courseId, sessionId))).data.data,
  saveSessionAttendance: async (courseId: number, sessionId: number, records: {
    enrollmentId: number; status: AttendanceStatus; note?: string | null;
  }[]) =>
    (await api.put<RequestResponse<SessionAttendanceResponse>>(
      API_ENDPOINT.SESSION_ATTENDANCE(courseId, sessionId), { records },
    )).data.data,
  sessionAttendanceHistory: async (courseId: number, sessionId: number) =>
    (await api.get<RequestResponse<AttendanceAuditLogResponse[]>>(
      API_ENDPOINT.SESSION_ATTENDANCE_HISTORY(courseId, sessionId),
    )).data.data,
  courseAttendanceMatrix: async (courseId: number) =>
    (await api.get<RequestResponse<AttendanceMatrixResponse>>(
      API_ENDPOINT.COURSE_ATTENDANCE(courseId),
    )).data.data,
  exportCourseAttendance: async (courseId: number) =>
    (await api.get<Blob>(API_ENDPOINT.COURSE_ATTENDANCE_EXPORT(courseId), { responseType: 'blob' })).data,
};
