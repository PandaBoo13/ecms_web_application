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
  studentName?: string | null;
  studentCode?: string | null;
  studentEmail?: string | null;
  studentPhone?: string | null;
  courseTitle?: string | null;
  invoiceCode?: string | null;
}

export type AttendanceStatus = 'NOT_MARKED' | 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface AttendanceRecordResponse {
  attendanceId: number;
  enrollmentId: number;
  sessionId: number;
  sessionNumber: number | null;
  sessionTitle: string | null;
  sessionDate: string | null;
  sessionStartTime: string | null;
  status: AttendanceStatus;
  checkInAt: string | null;
  note: string | null;
  studentName: string | null;
  studentCode: string | null;
  markedAt: string | null;
  markedBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
}

export interface EnrollmentStatusLogResponse {
  id: number;
  oldStatus: EnrollmentResponse['status'] | null;
  newStatus: EnrollmentResponse['status'];
  reason: string | null;
  changedAt: string;
}
