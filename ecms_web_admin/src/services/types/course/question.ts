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

export interface QuestionCreateRequest {
  lessonId?: number;
  questionType: QuestionType;
  content: string;
  options?: string[];
  correctAnswer?: string[];
  explanation?: string;
  hashtag?: string;
  points?: number;
  orderIndex?: number;
  status?: QuestionStatus;
}