// src/services/types/course/question.ts
import type { QuestionStatus, QuestionType } from './enums';

export interface QuestionResponse {
  id: number;
  courseId: number;
  lessonId?: number;
  lessonTitle?: string;
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
 * Backend dùng CHUNG schema cho cả 2 endpoint.
 *
 * ⚠️ Business rule:
 *  - Câu hỏi BẮT BUỘC thuộc 1 Lesson (comment trong QuestionController).
 *  - Vì vậy FE set `lessonId` là required — khi update nếu không đổi lesson
 *    thì vẫn gửi lại `lessonId` hiện tại của câu hỏi.
 *  - Bắt buộc: `questionType`, `content`, `lessonId`.
 */
export interface QuestionCreateRequest {
  lessonId: number;                  // required (business rule)
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