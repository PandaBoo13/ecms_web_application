export type EnrollmentType = 'OFFLINE' | 'ONLINE';
export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'RESERVED' | 'TERMINATED' | 'COMPLETED';

export interface EnrollmentSummaryResponse {
  pending: number;
  active: number;
  reserved: number;
  terminated: number;
  completed: number;
  offlineAwaitingEnrollment: number;
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
  updatedAt?: string | null;
  updatedBy?: number | null;
  holdReason: string | null;
  holdStartDate: string | null;
  holdEndDate: string | null;
  actualReturnDate?: string | null;
  holdProcessedBy?: number | null;
  terminationReason: string | null;
  terminatedAt?: string | null;
  terminatedBy?: number | null;
  finalScore: number | null;
  scoreRecordedAt?: string | null;
  scoreRecordedBy?: number | null;
  completedAt: string | null;
  completedBy?: number | null;
  absences: number;
  studentName?: string | null;
  studentCode?: string | null;
  studentEmail?: string | null;
  studentPhone?: string | null;
  courseTitle?: string | null;
  invoiceCode?: string | null;
  completionEligible?: boolean;
  completionBlockedReason?: string | null;
}

export interface EnrollmentBatchActionResponse {
  completed: number;
  failed: number;
  results: Array<{ enrollmentId: number; success: boolean; message: string }>;
}

export interface OfflineEnrollmentCandidate {
  courseId: number;
  courseTitle: string | null;
  courseStartDate: string | null;
  invoiceId: number;
  invoiceCode: string;
  paidAt: string | null;
  amount: number;
  studentId: number | null;
  studentCode: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  hasStudentProfile: boolean;
  hasLead: boolean;
}

export interface OfflineEnrollmentBatchResponse {
  enrolled: number;
  failed: number;
  results: Array<{
    invoiceId: number;
    success: boolean;
    enrollmentId: number | null;
    message: string;
  }>;
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
