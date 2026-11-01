import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type {
  AttendanceAbsenceResponse,
  CreateInvoiceRequest,
  EnrollmentResponse,
  EnrollmentStatusLogResponse,
  InvoiceResponse,
  RefundRequest,
  SessionAttendanceResponse,
  HoldRequest,
  ReasonRequest,
  FinalScoreRequest,
} from '../types/tuition-enrollment';

export const tuitionApi = {
  createOfflineInvoice: async (body: CreateInvoiceRequest) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_INVOICES, body)).data.data,
  createOnlineCheckout: async (courseId: number) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_CHECKOUT, null, { params: { courseId } })).data.data,
  createVnpayPayment: async (invoiceId: number) =>
    (await api.post<RequestResponse<{ paymentUrl: string }>>(API_ENDPOINT.TUITION_VNPAY_START(invoiceId))).data.data,
  searchInvoices: async (params: Record<string, unknown>) =>
    (await api.get<RequestResponse<PageResponse<InvoiceResponse>>>(API_ENDPOINT.TUITION_INVOICES, { params })).data.data,
  getInvoice: async (id: number) =>
    (await api.get<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_INVOICE_DETAIL(id))).data.data,
  confirmCash: async (id: number) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_CASH_CONFIRMATION(id))).data.data,
  extendDueDate: async (id: number, dueAt: string) =>
    (await api.patch<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_DUE_DATE(id), { dueAt })).data.data,
  cancelInvoice: async (id: number, body: ReasonRequest) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_CANCEL(id), body)).data.data,
  refundInvoice: async (id: number, body: RefundRequest) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_REFUND(id), body)).data.data,
};

export const enrollmentApi = {
  createOffline: async (invoiceId: number) =>
    (await api.post<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_OFFLINE, { invoiceId })).data.data,
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
  attendanceHistory: async (id: number) =>
    (await api.get<RequestResponse<AttendanceAbsenceResponse[]>>(API_ENDPOINT.ENROLLMENT_ATTENDANCE_HISTORY(id))).data.data,
  statusHistory: async (id: number) =>
    (await api.get<RequestResponse<EnrollmentStatusLogResponse[]>>(API_ENDPOINT.ENROLLMENT_STATUS_HISTORY(id))).data.data,
  sessionAttendance: async (courseId: number, sessionId: number) =>
    (await api.get<RequestResponse<SessionAttendanceResponse>>(API_ENDPOINT.SESSION_ATTENDANCE(courseId, sessionId))).data.data,
  recordAbsences: async (courseId: number, sessionId: number, absentEnrollmentIds: number[]) =>
    (await api.post<RequestResponse<AttendanceAbsenceResponse[]>>(
      API_ENDPOINT.SESSION_ABSENCES(courseId, sessionId), { absentEnrollmentIds },
    )).data.data,
};
