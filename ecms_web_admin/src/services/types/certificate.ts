export type CertificateStatus = 'ISSUED' | 'REVOKED';

export interface CertificateResponse {
  certificateId: number;
  certificateCode: string;
  enrollmentId: number;
  studentId: number;
  studentCode: string | null;
  studentName: string;
  courseId: number;
  courseTitle: string;
  finalScore: number | null;
  completedAt: string | null;
  status: CertificateStatus;
  issuedAt: string;
  issuedBy: number;
  revokedAt: string | null;
  revokedBy: number | null;
  revokeReason: string | null;
}

export interface CertificateEligibleResponse {
  enrollmentId: number;
  studentId: number;
  studentCode: string | null;
  studentName: string | null;
  studentEmail: string | null;
  studentPhone: string | null;
  courseId: number;
  courseTitle: string | null;
  finalScore: number | null;
  completedAt: string | null;
}
