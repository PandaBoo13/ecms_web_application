// src/services/types/course/quiz.ts
import type { QuestionType, QuizAttemptStatus, QuizCategory } from './enums';

export interface QuizResponse {
  id: number;
  courseId: number;
  title: string;
  quizType: QuizCategory;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  shuffleQuestions?: boolean;
  totalQuestions?: number;
  hashtagFilter?: string;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestionView {
  id: number;
  content: string;
  questionType: QuestionType;
  options?: string[];
  points?: number;
  orderIndex?: number;
  correctAnswer?: string[] | null;
  explanation?: string | null;
}

export interface QuizDetailResponse extends QuizResponse {
  questions: QuizQuestionView[];
}

export interface QuizAttemptResponse {
  id: number;
  accountId: number;
  courseId: number;
  resourceId: number;
  attemptNumber: number;
  questionIds?: number[];
  score?: number;
  maxScore?: number;
  passingScore?: number;
  isPassed?: boolean;
  status: QuizAttemptStatus;
  startedAt: string;
  submittedAt?: string;
  timeSpent?: number;
  questions?: QuizQuestionView[];
  answers?: Record<string, unknown>;
}

/**
 * Request tạo/cập nhật Quiz.
 *
 * ⚠️ Backend schema yêu cầu BẮT BUỘC 3 field: `title`, `quizType`, `passingScore`.
 * (xem OpenAPI: "required": ["passingScore", "quizType", "title"])
 * → Nếu thiếu `quizType` hoặc `passingScore` sẽ bị 400 Bad Request.
 */
export interface QuizCreateRequest {
  title: string;
  quizType: QuizCategory;      // required
  passingScore: number;        // required — 0..100
  maxAttempts?: number;        // >= 1
  timeLimit?: number;
  shuffleQuestions?: boolean;
  totalQuestions?: number;     // >= 1
  hashtagFilter?: string;
  availableFrom?: string;      // ISO datetime
  availableUntil?: string;     // ISO datetime
  parentId?: number;
}

export interface QuizSubmitRequest {
  attemptId: number;
  answers: string;
}