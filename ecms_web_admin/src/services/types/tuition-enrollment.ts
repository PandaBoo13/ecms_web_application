export type InvoiceType = 'TUITION_PAYMENT' | 'REFUND';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'VNPAY';
export type EnrollmentType = 'OFFLINE' | 'ONLINE';
export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'RESERVED' | 'TERMINATED' | 'COMPLETED';

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
}

export interface CreateInvoiceRequest {
  courseId: number;
  accountId?: number;
  studentId?: number;
  leadId?: number;
  amount: number;
  dueAt?: string;
}

export interface EnrollmentResponse {
  enrollmentId: number;
  enrollmentType: EnrollmentType;
  accountId: number | null;
  studentId: number | null;
  courseId: number;
  invoiceId: number;
  status: EnrollmentStatus;
  enrolledAt: string;
  enrolledBy: number;
  holdReason: string | null;
  holdStartDate: string | null;
  holdEndDate: string | null;
  terminationReason: string | null;
  finalScore: number | null;
  completedAt: string | null;
  absences: number;
}

export interface EnrollmentStatusLogResponse {
  id: number;
  oldStatus: EnrollmentStatus | null;
  newStatus: EnrollmentStatus;
  reason: string | null;
  changedBy: number | null;
  changedAt: string;
}

export interface AttendanceAbsenceResponse {
  attendanceId: number;
  enrollmentId: number;
  sessionId: number;
  createdAt: string;
  createdBy: number;
}

export interface SessionAttendanceResponse {
  courseId: number;
  sessionId: number;
  activeEnrollmentIds: number[];
  absentEnrollmentIds: number[];
}

export interface HoldRequest { reason: string; startDate: string; endDate: string }
export interface ReasonRequest { reason: string }
export interface FinalScoreRequest { finalScore: number }
export interface RefundRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  reason: string;
}
