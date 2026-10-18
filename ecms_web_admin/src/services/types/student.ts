export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface Student {
  id: number;
  studentCode: string;
  leadId?: number;
  userId?: number;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Guardian {
  id: number;
  studentId: number;
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface StudentStatusLog {
  id: number;
  studentId: number;
  oldStatus?: string;
  newStatus: string;
  reason?: string;
  changedBy?: number;
  changedAt: string;
}

export interface AcademicHistory {
  id: number;
  studentId: number;
  leadId?: number;
  enrollmentId?: number;
  courseId?: number;
  classId?: number;
  finalGrade?: number;
  createdAt: string;
}

export interface StudentDetail extends Student {
  guardians: Guardian[];
  academicHistories: AcademicHistory[];
  statusLogs: StudentStatusLog[];
}

export interface StudentFilterParams {
  search?: string;
  status?: StudentStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
}

export interface StudentCreatePayload {
  studentCode?: string;
  leadId?: number;
  userId?: number;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  status?: StudentStatus;
}

export interface StudentUpdatePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  userId?: number;
  status?: StudentStatus;
}

export interface StudentConvertFromLeadPayload {
  leadId: number;
  courseId?: number;
  classId?: number;
  note?: string;
}

export interface StudentStatusChangePayload {
  status: StudentStatus;
  reason: string;
}

export interface GuardianPayload {
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
}

