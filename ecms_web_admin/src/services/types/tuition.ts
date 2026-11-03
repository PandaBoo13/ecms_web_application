export type InvoiceType = 'TUITION_PAYMENT' | 'REFUND';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'VNPAY';

export interface InvoiceResponse {
  invoiceId: number;
  invoiceCode: string;
  type: InvoiceType;
  originalInvoiceId: number | null;
  accountId: number | null;
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
  createdBy: number;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  courseTitle: string | null;
  courseType: 'ONLINE' | 'OFFLINE' | null;
}

export interface CreateInvoiceRequest {
  courseId: number;
  accountId?: number;
  studentId?: number;
  leadId?: number;
  amount: number;
  dueAt?: string;
}

export interface ReasonRequest { reason: string }

export interface RefundRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  reason: string;
}
