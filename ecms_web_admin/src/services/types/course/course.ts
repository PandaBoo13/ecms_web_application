// src/services/types/course/course.ts
import type {
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
  progressType: ProgressType;
  status: CourseStatus;

  // 🆕 Tổng số buổi dự kiến (COURSE OFFLINE)
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
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetailResponse extends CourseResponse {
  outcomes?: string[];
  resources: CourseResourceResponse[];
  sessions: SessionResponse[];
}

export interface CourseCreateRequest {
  title: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  outcomes?: string[];
  price: number;
  oldPrice?: number;
  isFree?: boolean;
  courseType: CourseType;
  categoryId?: number;
  teacherId?: number;
  roomId?: number;
  learningMode?: LearningMode;
  allowedRoomIds?: number[];
  totalSessionsExpected?: number;
}

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
}

// ⚠️ ĐÃ SỬA: Thêm dấu "?" vào tất cả field để hỗ trợ partial update
export interface CourseOfflineInfoRequest {
  minStudents?: number;
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
  scheduleDays?: number[];
  sessionStartTime?: string;
  sessionEndTime?: string;
  teacherId?: number;
  roomId?: number;
}

export interface CourseReviewRequest {
  approved: boolean;
  rejectReason?: string;
}

export interface CourseCopyRequest {
  newTitle: string;
  newDisplayCode: string;
  resetPrice?: boolean;
}