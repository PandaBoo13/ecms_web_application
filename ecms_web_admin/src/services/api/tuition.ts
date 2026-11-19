import api from './axiosConfig';
import { API_ENDPOINT } from '@/constants/api-endpoint';
import type { PageResponse, RequestResponse } from '../types/api';
import type {
  CreateInvoiceFromLeadRequest,
  CreateInvoiceFromLeadResponse,
  EligibleLeadResponse,
  InvoiceResponse,
  PaymentLinkResponse,
  ReasonRequest,
  RecordRefundRequest,
  RefundApprovalStatusResponse,
  SubmitRefundApprovalRequest,
  TuitionInvoiceStats,
} from '../types/tuition';

export const tuitionApi = {
  createFromLead: async (body: CreateInvoiceFromLeadRequest) =>
    (await api.post<RequestResponse<CreateInvoiceFromLeadResponse>>(API_ENDPOINT.TUITION_FROM_LEAD, body)).data.data,
  createVnpayPayment: async (invoiceId: number) =>
    (await api.post<RequestResponse<{ paymentUrl: string }>>(API_ENDPOINT.TUITION_VNPAY_START(invoiceId))).data.data,
  searchInvoices: async (params: Record<string, unknown>) =>
    (await api.get<RequestResponse<PageResponse<InvoiceResponse>>>(API_ENDPOINT.TUITION_INVOICES, { params })).data.data,
  getInvoiceStats: async () =>
    (await api.get<RequestResponse<TuitionInvoiceStats>>(API_ENDPOINT.TUITION_INVOICE_STATS)).data.data,
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
  submitRefundApproval: async (id: number, body: SubmitRefundApprovalRequest) =>
    (await api.post<RequestResponse<unknown>>(API_ENDPOINT.TUITION_REFUND_APPROVAL(id), body)).data.data,
  getRefundApprovalStatus: async (id: number) =>
    (await api.get<RequestResponse<RefundApprovalStatusResponse>>(API_ENDPOINT.TUITION_REFUND_APPROVAL(id))).data.data,
  recordApprovedRefund: async (id: number, body: RecordRefundRequest) =>
    (await api.post<RequestResponse<InvoiceResponse>>(API_ENDPOINT.TUITION_REFUND_RECORD(id), body)).data.data,
  searchEligibleLeads: async (params: Record<string, unknown>) =>
    (await api.get<RequestResponse<PageResponse<EligibleLeadResponse>>>(API_ENDPOINT.TUITION_ELIGIBLE_LEADS, { params })).data.data,
  sendPaymentLink: async (id: number, email?: string) =>
    (await api.post<RequestResponse<PaymentLinkResponse>>(API_ENDPOINT.TUITION_PAYMENT_LINK(id), { email })).data.data,
};
