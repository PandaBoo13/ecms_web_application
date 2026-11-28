import type { QuestionStatus, QuestionType } from './enums';

export interface QuestionResponse {
  id: number;
  courseId: number;
  lessonId?: number | null;
  lessonTitle?: string | null;
  questionType: QuestionType;
  content: string;
  options?: string[];
  correctAnswer?: string[];
  explanation?: string;
  hashtag?: string;
  points: number;
  orderIndex: number;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request tạo/cập nhật câu hỏi — gửi tới
 *   `POST /api/courses/{courseId}/questions`
 *   `PUT  /api/courses/{courseId}/questions/{id}`
 *
 * - `lessonId` là tùy chọn (`null` hoặc bỏ trống = câu hỏi kho chung của khóa học).
 * - Bắt buộc: `questionType`, `content`.
 */
export interface QuestionCreateRequest {
  lessonId?: number | null;          // optional (null = kho chung)
  questionType: QuestionType;        // required
  content: string;                   // required, minLength 1
  options?: string[];
  correctAnswer?: string[];
  explanation?: string;
  hashtag?: string;
  points?: number;                   // >= 0
  orderIndex?: number;               // >= 0
  status?: QuestionStatus;           // ACTIVE | INACTIVE
}

export interface QuestionImportRowError {
  rowNumber: number;
  content: string;
  reason: string;
}

export interface QuestionImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: QuestionImportRowError[];
}