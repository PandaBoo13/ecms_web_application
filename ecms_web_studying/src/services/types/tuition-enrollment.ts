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
export interface EnrollmentResponse {
  enrollmentId: number;
  enrollmentType: 'OFFLINE' | 'ONLINE';
  courseId: number;
  invoiceId: number;
  status: 'PENDING' | 'ACTIVE' | 'RESERVED' | 'TERMINATED' | 'COMPLETED';
  enrolledAt: string;
  absences: number;
  finalScore: number | null;
  completedAt: string | null;
}
export interface AttendanceAbsenceResponse {
  attendanceId: number;
  enrollmentId: number;
  sessionId: number;
  createdAt: string;
}
export interface EnrollmentStatusLogResponse {
  id: number;
  oldStatus: EnrollmentResponse['status'] | null;
  newStatus: EnrollmentResponse['status'];
  reason: string | null;
  changedAt: string;
}
