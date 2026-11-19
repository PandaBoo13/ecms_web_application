export type InvoiceType = 'TUITION_PAYMENT' | 'REFUND';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface InvoiceResponse {
  invoiceId: number;
  invoiceCode: string;
  type: InvoiceType;
  originalInvoiceId: number | null;
  originalInvoiceCode: string | null;
  studentId: number | null;
  leadId: number | null;
  courseId: number;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
  dueAt: string | null;
  paymentMethod: PaymentMethod | null;
  transactionReference: string | null;
  paidAt: string | null;
  confirmedBy: number | null;
  reason: string | null;
  paymentProofUrl: string | null;
  createdBy: number;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  courseTitle: string | null;
  courseType: 'ONLINE' | 'OFFLINE' | null;
}

export interface CreateInvoiceFromLeadRequest {
  leadId: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  /** Bắt buộc khi thu tiền mặt. */
  proofUrl?: string;
  /** Bỏ trống → dùng email của lead. */
  email?: string;
}

export interface CreateInvoiceFromLeadResponse {
  invoice: InvoiceResponse;
  paymentLink: PaymentLinkResponse | null;
}

export interface ReasonRequest { reason: string }

/** Gửi yêu cầu duyệt hoàn tiền (chưa thực hiện thủ công). */
export interface SubmitRefundApprovalRequest {
  amount: number;
  reason: string;
}

export type RefundApprovalUiStatus = 'NONE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface RefundApprovalStatusResponse {
  status: RefundApprovalUiStatus;
  requestId: number | null;
  requestCode: string | null;
  requestedAt: string | null;
  rejectReason: string | null;
  resolvedAt: string | null;
  requestedAmount: number | null;
  reason: string | null;
  canRecordRefund: boolean;
}

/** Ghi nhận hoàn tiền đã thực hiện thủ công (sau khi được duyệt). */
export interface RecordRefundRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  reason: string;
  proofUrl: string;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
  refundedAt?: string;
}

/** Lead đã tư vấn, chưa có hóa đơn học phí đang mở. */
export interface EligibleLeadResponse {
  leadId: number;
  fullName: string;
  email: string;
  phone: string;
  courseId: number | null;
  courseTitle: string | null;
  coursePrice: number | null;
  consultedAt: string | null;
  assignedConsultantId: number | null;
  note: string | null;
}

export interface PaymentLinkResponse {
  paymentLink: string;
  sentTo: string;
  expiresAt: string;
  /** true = email đã được xếp hàng gửi nền (lỗi SMTP chỉ ghi log phía server). */
  emailSent: boolean;
  emailError: string | null;
}

/** Thống kê số lượng hóa đơn học phí theo trạng thái. */
export interface TuitionInvoiceStats {
  total: number;
  pending: number;
  paid: number;
  overdue: number;
  cancelled: number;
}


