// src/services/types/course/progress.ts
import type { ProgressScope, ProgressStatus } from './enums';

export interface ProgressResponse {
  id: number;
  accountId: number;
  courseId: number;
  courseTitle?: string;
  progressType: ProgressScope;
  referenceId?: number;
  referenceType?: string;
  status: ProgressStatus;
  progressPercentage: number;
  totalTimeSpent?: number;
  score?: number;
  maxScore?: number;
  isPassed?: boolean;
  attempts?: number;
  notes?: string;
  totalItems?: number;
  completedItems?: number;
  weightedScore?: number;
  totalWeightPercent?: number;
  lastAccessedAt?: string;
  startedAt?: string;
  completedAt?: string;
  hasUncompletedNewContent?: boolean;
}

export interface ProgressUpdateRequest {
  percentage?: number;       // 0..100
  timeSpentSeconds?: number; // >= 0
}