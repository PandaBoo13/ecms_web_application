// src/services/types/course/course.ts
import type {
  ClassStatus,
  CourseStatus,
  CourseType,
  LearningMode,
  ProgressType,
} from './enums';
import type { CourseResourceResponse } from './resource';
import type { SessionResponse } from './session';

export interface CourseResponse {
  id: number;
  code: string;
  displayCode: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  price: number;
  oldPrice?: number;
  isFree: boolean;
  courseType: CourseType;
  progressType?: ProgressType;        // optional — chỉ có với khóa ONLINE
  status: CourseStatus;
  classStatus?: ClassStatus;

  /** Tổng số buổi dự kiến (COURSE OFFLINE) */
  totalSessionsExpected?: number;

  learningMode?: LearningMode;
  allowedRoomIds?: number[];
  teacherId?: number;
  teacherName?: string;
  createdById: number;
  categoryId?: number;
  categoryName?: string;
  roomId?: number;
  roomName?: string;
  minStudents?: number;
  maxStudents?: number;
  currentStudents: number;
  startDate?: string;
  endDate?: string;
  scheduleDays?: number[];
  sessionStartTime?: string;
  sessionEndTime?: string;
  copiedFromCourseId?: number;

  /** Cấu hình chứng chỉ (nếu khóa có cấp chứng chỉ) */
  certificateTypeId?: number;
  certificateConfig?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

export interface CourseDetailResponse extends CourseResponse {
  outcomes?: string[];
  resources: CourseResourceResponse[];
  sessions: SessionResponse[];
}

/**
 * Request tạo khóa học mới — gửi tới `POST /api/courses`.
 *
 * ⚠️ LƯU Ý: KHÔNG chứa `minStudents` / `maxStudents`.
 * Hai field này thuộc `CourseOfflineInfoRequest` và phải gửi qua
 * `PUT /api/courses/{id}/offline-info` (sau khi đã tạo khóa thành công).
 *
 * Form tạo khóa nên dùng `CourseCreateFormState` (bên dưới) để hứng dữ liệu,
 * rồi map sang `CourseCreateRequest` khi submit.
 */
export interface CourseCreateRequest {
  title: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  outcomes?: string[];
  price: number;                       // >= 0
  oldPrice?: number;                   // >= 0
  isFree?: boolean;
  courseType: CourseType;              // ONLINE | OFFLINE
  categoryId?: number;
  teacherId?: number;
  roomId?: number;
  learningMode?: LearningMode;         // AUTONOMOUS | SEQUENTIAL
  allowedRoomIds?: number[];
  totalSessionsExpected?: number;      // >= 0
  certificateTypeId?: number;
  certificateConfig?: Record<string, unknown>;
}

/**
 * Form state khi user điền form "Tạo khóa học".
 *
 * Chứa thêm `minStudents` / `maxStudents` để user nhập trên CÙNG form.
 * Khi submit: tách ra 2 bước —
 *   1. POST /api/courses                       (bỏ min/max)
 *   2. PUT  /api/courses/{id}/offline-info     (chỉ gửi min/max nếu OFFLINE)
 */
export interface CourseCreateFormState extends CourseCreateRequest {
  minStudents?: number;   // >= 1 nếu có
  maxStudents?: number;   // >= 1 nếu có
}

/**
 * Request cập nhật khóa học — gửi tới `PUT /api/courses/{id}`.
 *
 * ⚠️ Tương tự Create: KHÔNG chứa `minStudents` / `maxStudents`.
 * Dùng `PUT /api/courses/{id}/offline-info` để cập nhật 2 field đó.
 */
export interface CourseUpdateRequest {
  title?: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  outcomes?: string[];
  price?: number;
  oldPrice?: number;
  isFree?: boolean;
  categoryId?: number;
  roomId?: number;
  learningMode?: LearningMode;
  allowedRoomIds?: number[];
  totalSessionsExpected?: number;
  certificateTypeId?: number;
  certificateConfig?: Record<string, unknown>;
}

/**
 * Request cập nhật riêng thông tin lớp Offline — gửi tới
 * `PUT /api/courses/{id}/offline-info`.
 *
 * Toàn bộ field đều optional để hỗ trợ partial update.
 * ⚠️ Nếu gửi `minStudents` / `maxStudents` thì phải >= 1 (backend validate).
 */
export interface CourseOfflineInfoRequest {
  minStudents?: number;        // >= 1 nếu có
  maxStudents?: number;        // >= 1 nếu có
  startDate?: string;          // yyyy-MM-dd
  endDate?: string;            // yyyy-MM-dd
  scheduleDays?: number[];     // 0..6 (Mon..Sun tùy backend convention)
  sessionStartTime?: string;   // HH:mm:ss
  sessionEndTime?: string;     // HH:mm:ss
  teacherId?: number;
  roomId?: number;
}

export interface CourseReviewRequest {
  approved: boolean;
  rejectReason?: string;       // chỉ dùng khi approved = false
}

export interface CourseCopyRequest {
  newTitle: string;
  newDisplayCode: string;
  resetPrice?: boolean;
}

/**
 * Dữ liệu trả về từ API GET /api/courses/my-enrolled
 * (Lấy từ bảng enrollments join với course và progress)
 */
export interface EnrolledCourseResponse {
  enrollmentId: number;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  thumbnailUrl?: string;
  enrollmentStatus: 'PENDING' | 'ACTIVE' | 'RESERVED' | 'COMPLETED' | 'TERMINATED';
  enrolledAt: string;
  progressPercentage?: number;
}