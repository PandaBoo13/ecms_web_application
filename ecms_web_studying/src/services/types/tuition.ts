export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceResponse {
  invoiceId: number;
  invoiceCode: string;
  courseId: number;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
  dueAt: string | null;
  paidAt: string | null;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'VNPAY' | null;
}
