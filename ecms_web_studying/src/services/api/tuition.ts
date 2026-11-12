import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type { InvoiceResponse, OnlineCheckoutContact, PublicInvoiceResponse, VnpayReturnResponse } from '../types/tuition';

export const LAST_ONLINE_PAYMENT_INVOICE_KEY = 'ecms_last_online_payment_invoice';

export const tuitionApi = {
  createOnlineCheckout: async (courseId: number, contact: OnlineCheckoutContact): Promise<InvoiceResponse> =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_CHECKOUT, contact, { params: { courseId } })).data.data,
  createVnpayPayment: async (invoiceId: number): Promise<string> =>
    (await api.post<RequestResponse<{ paymentUrl: string }>>(API_ENDPOINT.TUITION_VNPAY_START(invoiceId))).data.data.paymentUrl,
  myInvoices: async (params: Record<string, unknown> = {}): Promise<PageResponse<InvoiceResponse>> =>
    (await api.get<RequestResponse<PageResponse<InvoiceResponse>>>(API_ENDPOINT.TUITION_INVOICES, { params })).data.data,
  getInvoice: async (id: number): Promise<InvoiceResponse> =>
    (await api.get<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_INVOICE_DETAIL(id))).data.data,
};

/** Endpoint công khai cho link thanh toán gửi qua email (không cần đăng nhập). */
export const publicTuitionApi = {
  getPaymentLink: async (token: string): Promise<PublicInvoiceResponse> =>
    (await api.get<RequestResponse<PublicInvoiceResponse>>(API_ENDPOINT.PUBLIC_TUITION_PAYMENT_LINK, { params: { token } })).data.data,
  createVnpayUrl: async (token: string): Promise<string> =>
    (await api.get<RequestResponse<{ paymentUrl: string }>>(API_ENDPOINT.PUBLIC_TUITION_PAYMENT_LINK_VNPAY, { params: { token } })).data.data.paymentUrl,
  verifyVnpayReturn: async (search: string): Promise<VnpayReturnResponse> =>
    (await api.get<RequestResponse<VnpayReturnResponse>>(`${API_ENDPOINT.PUBLIC_TUITION_VNPAY_RETURN}${search}`)).data.data,
};
