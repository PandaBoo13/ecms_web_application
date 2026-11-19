import type { CourseStatus } from '@/services/types/course/enums';

export type EnrollmentType = 'OFFLINE' | 'ONLINE';
export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'RESERVED' | 'TERMINATED' | 'COMPLETED';
export type CompletionResult = 'PASSED' | 'FAILED';

export interface EnrollmentSummaryResponse {
  pending: number;
  active: number;
  reserved: number;
  terminated: number;
  completed: number;
  awaitingEnrollment: number;
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
  completionResult?: CompletionResult | null;
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

export interface FinalScoreImportResponse {
  updated: number;
  skipped: number;
  issues: Array<{ row: number; enrollmentId: number | null; message: string }>;
}

export type GradeReviewStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface GradeReviewStatusResponse {
  status: GradeReviewStatus;
  requestId: number | null;
  requestCode: string | null;
  requestedAt: string | null;
  rejectReason: string | null;
  resolvedAt: string | null;
}

export interface EnrollmentStatusLogResponse {
  id: number;
  oldStatus: EnrollmentStatus | null;
  newStatus: EnrollmentStatus;
  reason: string | null;
  changedBy: number | null;
  changedAt: string;
}

export type AttendanceStatus = 'NOT_MARKED' | 'PRESENT' | 'ABSENT' | 'EXCUSED';

export interface AttendanceRecordResponse {
  attendanceId: number | null;
  enrollmentId: number;
  sessionId: number;
  sessionNumber: number | null;
  sessionTitle: string | null;
  sessionDate: string | null;
  sessionStartTime: string | null;
  status: AttendanceStatus;
  note: string | null;
  studentName: string | null;
  studentCode: string | null;
  markedAt: string | null;
  markedBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
  leaveRequestId?: number | null;
  leaveRequestStatus?: string | null;
  leaveRequestReason?: string | null;
}

export interface SessionAttendanceResponse {
  courseId: number;
  sessionId: number;
  editable: boolean;
  lockReason: string | null;
  editDeadline: string | null;
  records: AttendanceRecordResponse[];
}

export interface AttendanceAuditLogResponse {
  id: number;
  actorId: number | null;
  actorName: string | null;
  action: string;
  changedAt: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface AttendanceMatrixCell {
  attendanceId: number | null;
  status: AttendanceStatus;
  note: string | null;
  leaveRequestId?: number | null;
  leaveRequestStatus?: string | null;
  leaveRequestReason?: string | null;
}

export interface AttendanceMatrixSession {
  sessionId: number;
  sessionNumber: number;
  title: string;
  sessionDate: string | null;
  startTime: string;
  endTime: string;
  status: string;
  editable: boolean;
  lockReason: string | null;
  editDeadline: string | null;
}

export interface AttendanceMatrixSummary {
  present: number;
  absent: number;
  excused: number;
  notMarked: number;
  absencePoints: number;
  absencePercent: number;
}

export interface AttendanceMatrixStudent {
  enrollmentId: number;
  studentId: number | null;
  studentCode: string | null;
  studentName: string | null;
  email: string | null;
  enrollmentStatus: EnrollmentStatus;
  /** Khoá là sessionId (JSON trả về dạng chuỗi). */
  cells: Record<string, AttendanceMatrixCell>;
  summary: AttendanceMatrixSummary;
}

export interface AttendanceMatrixResponse {
  courseId: number;
  courseCode: string | null;
  courseTitle: string | null;
  conductedSessions: number;
  sessions: AttendanceMatrixSession[];
  students: AttendanceMatrixStudent[];
  rules: {
    maxAbsencePercent: number;
  };
}

export interface InstructorAttendanceSession {
  sessionId: number;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  sessionNumber: number;
  sessionTitle: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface InstructorAttendanceCourse {
  courseId: number;
  courseCode: string;
  courseTitle: string;
  assignedSessionCount: number;
  courseStatus?: CourseStatus | null;
  startDate?: string | null;
  endDate?: string | null;
  isFinished?: boolean;
}

export interface HoldRequest { reason: string; startDate: string; endDate: string }
export interface ReasonRequest { reason: string }
export interface FinalScoreRequest { finalScore: number }
