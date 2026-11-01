import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type {
  AttendanceAbsenceResponse,
  EnrollmentResponse,
  EnrollmentStatusLogResponse,
  InvoiceResponse,
} from '../types/tuition-enrollment';

export const tuitionApi = {
  createOnlineCheckout: async (courseId: number): Promise<InvoiceResponse> =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_CHECKOUT, null, { params: { courseId } })).data.data,
  createVnpayPayment: async (invoiceId: number): Promise<string> =>
    (await api.post<RequestResponse<{ paymentUrl: string }>>(API_ENDPOINT.TUITION_VNPAY_START(invoiceId))).data.data.paymentUrl,
  myInvoices: async (params: Record<string, unknown> = {}): Promise<PageResponse<InvoiceResponse>> =>
    (await api.get<RequestResponse<PageResponse<InvoiceResponse>>>(API_ENDPOINT.TUITION_INVOICES, { params })).data.data,
  getInvoice: async (id: number): Promise<InvoiceResponse> =>
    (await api.get<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_INVOICE_DETAIL(id))).data.data,
};

export const enrollmentApi = {
  myEnrollments: async (params: Record<string, unknown> = {}): Promise<PageResponse<EnrollmentResponse>> =>
    (await api.get<RequestResponse<PageResponse<EnrollmentResponse>>>(API_ENDPOINT.ENROLLMENTS, { params })).data.data,
  get: async (id: number): Promise<EnrollmentResponse> =>
    (await api.get<RequestResponse<EnrollmentResponse>>(API_ENDPOINT.ENROLLMENT_DETAIL(id))).data.data,
  attendanceHistory: async (id: number): Promise<AttendanceAbsenceResponse[]> =>
    (await api.get<RequestResponse<AttendanceAbsenceResponse[]>>(API_ENDPOINT.ENROLLMENT_ATTENDANCE_HISTORY(id))).data.data,
  statusHistory: async (id: number): Promise<EnrollmentStatusLogResponse[]> =>
    (await api.get<RequestResponse<EnrollmentStatusLogResponse[]>>(API_ENDPOINT.ENROLLMENT_STATUS_HISTORY(id))).data.data,
};
