// src/services/types/course/availability.ts
/**
 * Schema thực tế KHÔNG có trong OpenAPI — suy ra từ controller.
 * Cần verify lại field name với BE.
 */
export interface AvailabilitySlot {
  startTime: string;   // ISO datetime
  endTime: string;     // ISO datetime
  // Có thể có thêm: courseId, courseTitle, sessionId, teacherId...
  [key: string]: unknown;
}

export interface AvailabilityResponse {
  isAvailable: boolean;
  busySlots: AvailabilitySlot[];
  freeWindows?: AvailabilitySlot[];
  /** Chỉ có ở instructor availability — tải theo tuần. */
  weeklyLoad?: number;
}