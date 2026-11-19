// src/services/types/course/resource.ts
import type { QuizCategory, ResourceStatus, ResourceType } from './enums';

export interface CourseResourceResponse {
  id: number;
  courseId: number;
  parentId?: number;
  resourceType: ResourceType;
  title: string;
  description?: string;
  orderIndex: number;
  isRequired: boolean;
  isFreePreview: boolean;
  duration?: number;
  content?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileFormat?: string;
  mimeType?: string;
  maxAttempts?: number;
  passingScore?: number;
  timeLimit?: number;
  points?: number;
  status: ResourceStatus;
  availableFrom?: string;
  availableUntil?: string;
  quizCategory?: QuizCategory;
  hashtagFilter?: string;
  totalQuestions?: number;
  shuffleQuestions?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceTreeResponse {
  id: number;
  resourceType: ResourceType;
  title: string;
  orderIndex: number;
  isRequired: boolean;
  isFreePreview: boolean;
  duration?: number;
  fileUrl?: string;
  status: ResourceStatus;
  quizCategory?: QuizCategory;
  passingScore?: number;
  maxAttempts?: number;
  hashtagFilter?: string;
  children?: ResourceTreeResponse[];
}

/**
 * Request tạo resource mới — gửi tới `POST /api/courses/{courseId}/resources`.
 * Bắt buộc: `resourceType`, `title`.
 * (Backend chỉ cho phép thêm khi course ở trạng thái DRAFT.)
 */
export interface ResourceCreateRequest {
  resourceType: ResourceType;
  parentId?: number;
  title: string;
  description?: string;
  orderIndex?: number;             // >= 0
  isRequired?: boolean;
  isFreePreview?: boolean;
  duration?: number;               // giây, >= 0
  content?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileFormat?: string;
  mimeType?: string;
  maxAttempts?: number;            // >= 1
  passingScore?: number;           // 0..100
  timeLimit?: number;              // >= 0
  points?: number;                 // >= 0
  deadline?: string;               // ISO datetime
  settings?: Record<string, unknown>;
  status?: ResourceStatus;
  availableFrom?: string;          // ISO datetime
  availableUntil?: string;         // ISO datetime
  quizCategory?: QuizCategory;
  hashtagFilter?: string;
  totalQuestions?: number;         // >= 1
  shuffleQuestions?: boolean;
}

/**
 * Request cập nhật resource — gửi tới
 * `PUT /api/courses/{courseId}/resources/{id}`.
 *
 * ⚠️ Backend KHÔNG cho phép đổi `resourceType` (khi đã tạo, không đổi loại được)
 * và KHÔNG cho phép đổi `parentId` qua endpoint update
 * (muốn di chuyển thì dùng `reorder` hoặc delete + create).
 * → Loại 2 field này khỏi type update.
 */
export type ResourceUpdateRequest = Partial<
  Omit<ResourceCreateRequest, 'resourceType' | 'parentId'>
>;

/** Item trong payload reorder — `PUT /api/courses/{courseId}/resources/reorder`. */
export interface ReorderItem {
  id: number;
  orderIndex: number;   // >= 0
}

export interface ResourceReorderRequest {
  items: ReorderItem[]; // minItems: 1
}