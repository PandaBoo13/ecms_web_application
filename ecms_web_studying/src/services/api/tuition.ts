import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type { InvoiceResponse } from '../types/tuition';

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
