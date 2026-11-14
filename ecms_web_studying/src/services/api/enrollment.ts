import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type {
  AttendanceRecordResponse,
  EnrollmentResponse,
  EnrollmentStatusLogResponse,
} from '../types/enrollment';

export const enrollmentApi = {
  myEnrollments: async (params: Record<string, unknown> = {}): Promise<PageResponse<EnrollmentResponse>> =>
    (await api.get<RequestResponse<PageResponse<EnrollmentResponse>>>(API_ENDPOINT.ENROLLMENTS, { params })).data.data,
  get: async (id: number): Promise<EnrollmentResponse> =>
    (await api.get<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_DETAIL(id))).data.data,
  attendanceHistory: async (id: number): Promise<AttendanceRecordResponse[]> =>
    (await api.get<RequestResponse<AttendanceRecordResponse[]>>(API_ENDPOINT.ENROLLMENT_ATTENDANCE_HISTORY(id))).data.data,
  statusHistory: async (id: number): Promise<EnrollmentStatusLogResponse[]> =>
    (await api.get<RequestResponse<EnrollmentStatusLogResponse[]>>(API_ENDPOINT.ENROLLMENT_STATUS_HISTORY(id))).data.data,
};
