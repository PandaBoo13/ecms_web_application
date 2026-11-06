// src/services/types/request/request.ts

// ============================================================
// ENUMS — mirror backend RequestStatus + RequestType
// ============================================================

export const REQUEST_STATUS_VALUES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export type RequestStatus = (typeof REQUEST_STATUS_VALUES)[number];

/**
 * Mirror đầy đủ enum `RequestType` ở backend.
 * Dùng const array để vừa có type vừa có runtime options cho dropdown.
 */
export const REQUEST_TYPE_VALUES = [
  // ===== COURSE =====
  'COURSE_REVIEW',
  'COURSE_UNPUBLISH',
  'COURSE_CLONE',
  'COURSE_DELETE',
  'COURSE_PRICE_CHANGE',
  'COURSE_TEACHER_CHANGE',
  // ===== SESSION =====
  'SCHEDULE_CHANGE',
  'SCHEDULE_CANCEL',
  'ROOM_CHANGE',
  'SESSION_SUBSTITUTE',
  'SESSION_EXTEND',
  'SESSION_ADD',
  // ===== FINANCE =====
  'INVOICE_REFUND',
  'INVOICE_ADJUSTMENT',
  'INVOICE_CANCEL',
  'INVOICE_EXTEND_DUE',
  'PAYMENT_CONFIRM',
  // ===== ENROLLMENT =====
  'ENROLLMENT_TERMINATE',
  'ENROLLMENT_RESERVE',
  'ENROLLMENT_RESUME',
  'ENROLLMENT_TRANSFER',
  // ===== STUDENT =====
  'STUDENT_STATUS_CHANGE',
  'STUDENT_LOCK_ACCOUNT',
  'STUDENT_PROFILE_UPDATE',
  // ===== LEAD =====
  'LEAD_ASSIGNMENT',
  'LEAD_CLOSE',
  'LEAD_CONVERT',
  // ===== ACCOUNT =====
  'ACCOUNT_ROLE_CHANGE',
  'ACCOUNT_RESET_PASSWORD',
  'ACCOUNT_UNLOCK',
  'INSTRUCTOR_SPEC_ADD',
  // ===== NOTIFICATION =====
  'NOTIFICATION_BROADCAST',
  'NOTIFICATION_BLAST',
  // ===== SUPPORT / FEEDBACK =====
  'SUPPORT_TICKET',
  'FEEDBACK',
  'BUG_REPORT',
  'FEATURE_REQUEST',
  'COMPLAINT',
  'SUGGESTION',
  'DOCUMENT_REQUEST',
  'CERTIFICATE_REQUEST',
  'LEAVE_FEEDBACK',
  'DATA_EXPORT',
  // ===== HR / INTERNAL =====
  'LEAVE_REQUEST',
  'OVERTIME_REQUEST',
  'EXPENSE_CLAIM',
  'EQUIPMENT_REQUEST',
] as const;
export type RequestType = (typeof REQUEST_TYPE_VALUES)[number];

/** Target entity type — mirror RequestType.getTargetEntityType() ở backend */
export type TargetEntityType =
  | 'COURSE'
  | 'SESSION'
  | 'INVOICE'
  | 'ENROLLMENT'
  | 'STUDENT'
  | 'LEAD'
  | 'ACCOUNT'
  | 'NONE';

// ============================================================
// REQUEST DTOs — mirror backend
// ============================================================

/**
 * Payload khi requester tạo 1 yêu cầu.
 *  - requestType   : bắt buộc (enum code)
 *  - targetEntityId: optional — bỏ trống nếu type có targetEntityType='NONE'
 *  - payload       : field riêng từng loại (vd SCHEDULE_CHANGE cần proposed_start...)
 */
export interface RequestCreateRequest {
  requestType: RequestType | string;
  title: string;
  description?: string;
  targetEntityId?: number;
  payload?: Record<string, unknown>;
}

/**
 * Payload khi approver duyệt / từ chối.
 *  - approved = true  → status APPROVED + Handler.onApprove
 *  - approved = false → BẮT BUỘC note + status REJECTED + Handler.onReject
 */
export interface RequestReviewRequest {
  approved: boolean;
  /** Bắt buộc khi approved = false (service backend validate) */
  note?: string;
  /** Dữ liệu trả về tuỳ loại request (reply, action_taken, ...) */
  responseData?: Record<string, unknown>;
}

/**
 * Filter cho search — dùng @ModelAttribute ở backend (query params).
 */
export interface RequestSearchParams {
  requestType?: RequestType | string;
  status?: RequestStatus | string;
  requesterId?: number;

  targetEntityType?: TargetEntityType | string;
  targetEntityId?: number;

  keyword?: string;

  /** ISO date-time, vd '2025-01-01T00:00:00' */
  fromDate?: string;
  toDate?: string;

  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

/**
 * Response cơ bản — dùng cho list, search.
 */
export interface RequestResponse {
  id: number;
  requestCode: string;

  requestType: RequestType | string;
  requestTypeName: string;

  requesterId: number;
  requesterName?: string;

  targetEntityType: TargetEntityType | string;
  targetEntityId?: number;

  title: string;
  status: RequestStatus;
  rejectReason?: string;

  resolvedAt?: string;
  resolvedBy?: number;
  resolvedByName?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Response chi tiết — thêm description + payload + responseData.
 */
export interface RequestDetailResponse extends RequestResponse {
  description?: string;
  /** Input của requester — field riêng từng loại */
  payload?: Record<string, unknown>;
  /** Output của approver — reply / action / kết quả */
  responseData?: Record<string, unknown>;
}

// ============================================================
// CONFLICT PREVIEW — dùng khi duyệt COURSE_REVIEW
// ============================================================

/**
 * Loại conflict giữa 2 khóa học:
 *  - TEACHER : trùng giảng viên chính
 *  - ROOM    : trùng phòng học
 * (có thể cùng lúc cả 2 → cả 2 xuất hiện trong mảng conflictTypes)
 */
export type ConflictType = 'TEACHER' | 'ROOM';

/**
 * Chi tiết 1 conflict — mirror BE CourseConflictDetail.
 * Trả về 1 khóa học active khác bị trùng lịch với course đang xét.
 */
export interface CourseConflictDetail {
  // ── Course bị trùng ──
  conflictingCourseId: number;
  conflictingCourseTitle: string;
  conflictingCourseStatus: string; // PLANNED | PUBLISHED | ONGOING

  // ── Lịch của course conflict ──
  startDate?: string;    // ISO date
  endDate?: string;      // ISO date
  scheduleDays?: number[]; // [2,4,6]
  sessionStartTime?: string; // "08:00:00"
  sessionEndTime?: string;   // "10:00:00"

  // ── Session cụ thể (chỉ có ở tầng 2 — finalize) ──
  conflictingSessionId?: number;
  conflictingSessionNumber?: number;
  conflictingSessionStart?: string;
  conflictingSessionEnd?: string;

  // ── Loại conflict ──
  conflictTypes: ConflictType[];

  // ── Chi tiết tài nguyên trùng ──
  conflictingTeacherId?: number;
  conflictingTeacherName?: string;
  conflictingRoomId?: number;
  conflictingRoomName?: string;
}

/**
 * Response cho API preview conflict khi duyệt request COURSE_REVIEW.
 * Dùng để FE hiển thị banner + bảng cảnh báo trước khi admin bấm Approve.
 */
export interface RequestConflictPreviewResponse {
  requestId: number;

  targetCourseId?: number;
  targetCourseTitle?: string;

  hasConflicts: boolean;
  conflictCount: number;

  conflicts: CourseConflictDetail[];

  /** Message tóm tắt hiển thị banner */
  message?: string;
}

// ============================================================
// HELPER LABELS (dùng cho UI dropdown/badge)
// ============================================================

/** Label tiếng Việt cho status — dùng cho badge/list */
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

/**
 * Label tiếng Việt cho từng RequestType — mirror `displayName` bên backend.
 * Chỉ khai báo các loại phổ biến; loại còn lại fallback về code.
 */
export const REQUEST_TYPE_LABELS: Partial<Record<RequestType, string>> = {
  COURSE_REVIEW: 'Kiểm duyệt khóa học',
  COURSE_UNPUBLISH: 'Gỡ xuất bản khóa học',
  COURSE_CLONE: 'Nhân bản khóa học',
  COURSE_DELETE: 'Xóa khóa học',
  COURSE_PRICE_CHANGE: 'Đổi học phí',
  COURSE_TEACHER_CHANGE: 'Đổi giảng viên chính',

  SCHEDULE_CHANGE: 'Đổi lịch dạy',
  SCHEDULE_CANCEL: 'Hủy buổi học',
  ROOM_CHANGE: 'Đổi phòng học',
  SESSION_SUBSTITUTE: 'Gán GV dạy thay',
  SESSION_EXTEND: 'Kéo dài buổi học',
  SESSION_ADD: 'Thêm buổi học',

  INVOICE_REFUND: 'Hoàn tiền',
  INVOICE_ADJUSTMENT: 'Điều chỉnh hóa đơn',
  INVOICE_CANCEL: 'Hủy hóa đơn',
  INVOICE_EXTEND_DUE: 'Gia hạn hạn thanh toán',
  PAYMENT_CONFIRM: 'Xác nhận thanh toán',

  ENROLLMENT_TERMINATE: 'Chấm dứt ghi danh',
  ENROLLMENT_RESERVE: 'Bảo lưu ghi danh',
  ENROLLMENT_RESUME: 'Quay lại sau bảo lưu',
  ENROLLMENT_TRANSFER: 'Chuyển khóa học',

  STUDENT_STATUS_CHANGE: 'Đổi trạng thái học viên',
  STUDENT_LOCK_ACCOUNT: 'Khóa tài khoản học viên',
  STUDENT_PROFILE_UPDATE: 'Cập nhật hồ sơ học viên',

  LEAD_ASSIGNMENT: 'Phân công tư vấn viên',
  LEAD_CLOSE: 'Đóng Lead',
  LEAD_CONVERT: 'Chuyển Lead sang Student',

  ACCOUNT_ROLE_CHANGE: 'Đổi role tài khoản',
  ACCOUNT_RESET_PASSWORD: 'Reset mật khẩu',
  ACCOUNT_UNLOCK: 'Mở khóa tài khoản',
  INSTRUCTOR_SPEC_ADD: 'Thêm chuyên môn GV',

  SUPPORT_TICKET: 'Yêu cầu hỗ trợ',
  FEEDBACK: 'Phản hồi / Góp ý',
  BUG_REPORT: 'Báo cáo lỗi',
  FEATURE_REQUEST: 'Đề xuất tính năng',
  COMPLAINT: 'Khiếu nại',
  SUGGESTION: 'Đề xuất cải tiến',

  LEAVE_REQUEST: 'Xin nghỉ phép',
  OVERTIME_REQUEST: 'Xin tăng ca',
  EXPENSE_CLAIM: 'Đề nghị thanh toán công tác',
  EQUIPMENT_REQUEST: 'Yêu cầu cấp thiết bị',
};

/** Fallback về code nếu chưa có label */
export function getRequestTypeLabel(type: string): string {
  return REQUEST_TYPE_LABELS[type as RequestType] ?? type;
}

/** 🆕 Label tiếng Việt cho loại conflict — dùng cho badge trong bảng conflict */
export const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  TEACHER: 'Trùng giảng viên',
  ROOM: 'Trùng phòng học',
};

/** 🆕 Helper: gộp mảng conflictTypes thành chuỗi label (vd "Trùng GV + Trùng phòng") */
export function getConflictTypesLabel(types: ConflictType[]): string {
  if (!types || types.length === 0) return '-';
  return types.map((t) => CONFLICT_TYPE_LABELS[t] ?? t).join(' + ');
}

/** 🆕 Helper: đổi scheduleDays [2,4,6] → "T2, T4, T6" */
export function formatScheduleDays(days?: number[]): string {
  if (!days || days.length === 0) return '-';
  const map: Record<number, string> = {
    1: 'CN', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7',
  };
  return days.map((d) => map[d] ?? d).join(', ');
}