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
