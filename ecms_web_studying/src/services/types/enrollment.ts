export interface EnrollmentResponse {
  enrollmentId: number;
  enrollmentType: 'OFFLINE' | 'ONLINE';
  courseId: number;
  invoiceId: number;
  status: 'PENDING' | 'ACTIVE' | 'RESERVED' | 'TERMINATED' | 'COMPLETED';
  completionResult?: 'PASSED' | 'FAILED' | null;
  enrolledAt: string;
  absences: number;
  finalScore: number | null;
  scorePublished: boolean;
  completedAt: string | null;
  courseCode?: string | null;
  studentName?: string | null;
  studentCode?: string | null;
  studentEmail?: string | null;
  studentPhone?: string | null;
  courseTitle?: string | null;
  invoiceCode?: string | null;
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
  sessionEndTime: string | null;
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

export interface EnrollmentStatusLogResponse {
  id: number;
  oldStatus: EnrollmentResponse['status'] | null;
  newStatus: EnrollmentResponse['status'];
  reason: string | null;
  changedAt: string;
}
