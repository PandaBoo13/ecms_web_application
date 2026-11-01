// src/services/types/course/session.ts
import type { SessionStatus } from './enums';

export interface SessionResponse {
  id: number;
  courseId: number;
  sessionNumber: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  sessionDate: string;
  teacherId?: number;
  teacherName?: string;
  substituteTeacherId?: number;
  substituteTeacherName?: string;
  assistantId?: number;
  assistantName?: string;
  roomId?: number;
  roomName?: string;
  effectiveTeacherId?: number;
  effectiveTeacherName?: string;
  effectiveRoomId?: number;
  effectiveRoomName?: string;
  status: SessionStatus;
  cancelReason?: string;
  note?: string;
  rescheduledFromId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionCreateRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  teacherId?: number;
  substituteTeacherId?: number;
  assistantId?: number;
  roomId?: number;
  note?: string;
}

export interface SessionCancelRequest {
  reason: string;
}

export interface SessionGenerationResult {
  courseId: number;
  totalDates: number;
  generated: number;
  skipped: Array<{ date: string; reason: string }>;
  message: string;
}