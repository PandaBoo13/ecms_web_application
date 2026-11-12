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

export interface PublicCertificateResponse {
  certificateCode: string;
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  status: CertificateStatus;
  revokedAt: string | null;
}
