import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type {
  CreateInvoiceFromLeadRequest,
  CreateInvoiceFromLeadResponse,
  CreateInvoiceFromStudentRequest,
  CreateInvoiceRequest,
  EligibleLeadResponse,
  InvoiceResponse,
  PaymentLinkResponse,
  ReasonRequest,
  RefundRequest,
} from '../types/tuition';

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
  confirmCash: async (id: number, proofUrl?: string) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_CASH_CONFIRMATION(id), { proofUrl })).data.data,
  confirmBankTransfer: async (id: number, transactionReference: string, proofUrl?: string) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_BANK_TRANSFER_CONFIRMATION(id), { transactionReference, proofUrl })).data.data,
  extendDueDate: async (id: number, dueAt: string) =>
    (await api.patch<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_DUE_DATE(id), { dueAt })).data.data,
  cancelInvoice: async (id: number, body: ReasonRequest) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_CANCEL(id), body)).data.data,
  refundInvoice: async (id: number, body: RefundRequest) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_REFUND(id), body)).data.data,
  searchEligibleLeads: async (params: Record<string, unknown>) =>
    (await api.get<RequestResponse<PageResponse<EligibleLeadResponse>>>(API_ENDPOINT.TUITION_ELIGIBLE_LEADS, { params })).data.data,
  createFromLead: async (body: CreateInvoiceFromLeadRequest) =>
    (await api.post<RequestResponse<CreateInvoiceFromLeadResponse>>(API_ENDPOINT.TUITION_FROM_LEAD, body)).data.data,
  createFromStudent: async (body: CreateInvoiceFromStudentRequest) =>
    (await api.post<RequestResponse<CreateInvoiceFromLeadResponse>>(API_ENDPOINT.TUITION_FROM_STUDENT, body)).data.data,
  sendPaymentLink: async (id: number, email?: string) =>
    (await api.post<RequestResponse<PaymentLinkResponse>>(API_ENDPOINT.TUITION_PAYMENT_LINK(id), { email })).data.data,
};
