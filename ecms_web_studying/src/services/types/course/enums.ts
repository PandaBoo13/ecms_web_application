// src/services/types/course/enums.ts
// ═══════════════════════════════════════════════════════════════
// ENUMS — đồng bộ DB schema + Java enum
// ═══════════════════════════════════════════════════════════════

export type CourseType = 'ONLINE' | 'OFFLINE';

// Khớp chk_course_status trong DB
export type CourseStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PLANNED'
  | 'PUBLISHED'
  | 'ONGOING'
  | 'FINISHED'
  | 'CANCELLED'
  | 'ARCHIVED';

/**
 * @deprecated BE đã đổi field classStatus thành @Transient → luôn null.
 * Dùng CourseStatus thay thế.
 */
export type ClassStatus = 'PLANNED' | 'OPEN' | 'ONGOING' | 'FINISHED' | 'CANCELLED';

export type ProgressType = 'COMPLETION_BASED' | 'SESSION_BASED';
export type LearningMode = 'AUTONOMOUS' | 'SEQUENTIAL';

export type ResourceType =
  | 'CHAPTER' | 'LESSON' | 'VIDEO' | 'PDF' | 'SLIDE' | 'AUDIO'
  | 'QUIZ' | 'ASSIGNMENT' | 'LINK' | 'DOCUMENT' | 'IMAGE';
export type ResourceStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';

export type QuizCategory = 'OPTIONAL' | 'MANDATORY';
export type QuizAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'TIMEOUT';

// Khớp chk_session_status trong DB
export type SessionStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

export type QuestionType =
  | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type QuestionStatus = 'ACTIVE' | 'INACTIVE';

export type ProgressScope = 'COURSE' | 'RESOURCE' | 'ASSIGNMENT';
export type ProgressStatus =
  | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PASSED' | 'FAILED';