export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface OnlineCheckoutContact {
  payerName: string;
  payerEmail: string;
  payerPhone: string;
}

export interface InvoiceResponse {
  invoiceId: number;
  invoiceCode: string;
  courseTitle?: string | null;
  courseType?: 'ONLINE' | 'OFFLINE' | null;
  courseId: number;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
  dueAt: string | null;
  paidAt: string | null;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | null;
  reason?: string | null;
  transactionReference?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
}

/** Kết quả checkout công khai: kèm token có chữ ký để mở cổng VNPAY. */
export interface PublicCheckoutResponse {
  invoiceId: number;
  invoiceCode: string;
  courseId: number;
  courseTitle: string | null;
  amount: number;
  status: InvoiceStatus;
  paymentToken: string | null;
}

/** Thông tin hoá đơn hiển thị trên trang thanh toán công khai (không cần đăng nhập). */
export interface PublicInvoiceResponse {
  invoiceCode: string;
  courseTitle: string | null;
  courseStartDate: string | null;
  amount: number;
  dueAt: string | null;
  status: InvoiceStatus;
  payerName: string | null;
  payerEmailMasked: string | null;
}

export interface VnpayReturnResponse {
  success: boolean;
  invoiceCode: string | null;
  amount: number | null;
  invoiceStatus: InvoiceStatus | null;
  courseType?: 'ONLINE' | 'OFFLINE' | null;
  responseCode: string | null;
  message: string;
}
