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

export interface ResourceCreateRequest {
  resourceType: ResourceType;
  parentId?: number;
  title: string;
  description?: string;
  orderIndex?: number;
  isRequired?: boolean;
  isFreePreview?: boolean;
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
  deadline?: string;
  settings?: Record<string, unknown>;
  status?: ResourceStatus;
  availableFrom?: string;
  availableUntil?: string;
  quizCategory?: QuizCategory;
  hashtagFilter?: string;
  totalQuestions?: number;
  shuffleQuestions?: boolean;
}

export type ResourceUpdateRequest = Partial<ResourceCreateRequest>;