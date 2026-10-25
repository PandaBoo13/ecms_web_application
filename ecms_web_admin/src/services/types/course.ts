// src/services/types/course.ts
// ═══════════════════════════════════════════════════════════════
// ENUMS (match BE)
// ═══════════════════════════════════════════════════════════════
export type CourseType = 'ONLINE' | 'OFFLINE';
export type CourseStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ONGOING' | 'ARCHIVED' | 'CANCELLED';
export type ClassStatus = 'PLANNED' | 'OPEN' | 'ONGOING' | 'FINISHED' | 'CANCELLED';
export type ProgressType = 'COMPLETION_BASED' | 'SESSION_BASED';
export type LearningMode = 'AUTONOMOUS' | 'SEQUENTIAL';

export type ResourceType =
  | 'CHAPTER' | 'LESSON' | 'VIDEO' | 'PDF' | 'SLIDE' | 'AUDIO'
  | 'QUIZ' | 'ASSIGNMENT' | 'LINK' | 'DOCUMENT' | 'IMAGE';
export type ResourceStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';

export type QuizCategory = 'OPTIONAL' | 'MANDATORY';
export type QuizAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'TIMEOUT';

export type SessionStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED' | 'RESCHEDULED';

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type QuestionStatus = 'ACTIVE' | 'INACTIVE';

export type ProgressScope = 'COURSE' | 'RESOURCE' | 'ASSIGNMENT';
export type ProgressStatus =
  | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PASSED' | 'FAILED';

// ═══════════════════════════════════════════════════════════════
// COURSE
// ═══════════════════════════════════════════════════════════════
export interface CourseResponse {
  id: number;
  code: string;
  displayCode: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  price: number;
  oldPrice?: number;
  isFree: boolean;
  courseType: CourseType;
  progressType: ProgressType;
  status: CourseStatus;
  classStatus?: ClassStatus;
  learningMode?: LearningMode;
  allowedRoomIds?: number[];
  teacherId?: number;
  teacherName?: string;
  createdById: number;
  categoryId?: number;
  categoryName?: string;
  roomId?: number;
  roomName?: string;
  minStudents?: number;
  maxStudents?: number;
  currentStudents: number;
  startDate?: string;
  endDate?: string;
  scheduleDays?: number[];
  sessionStartTime?: string;
  sessionEndTime?: string;
  copiedFromCourseId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseDetailResponse extends CourseResponse {
  outcomes?: string[];
  resources: CourseResourceResponse[];
  sessions: SessionResponse[];
}

// ═══════════════════════════════════════════════════════════════
// RESOURCE
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// SESSION — 3 cột GV + effective
// ═══════════════════════════════════════════════════════════════
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

export interface SessionGenerationResult {
  courseId: number;
  totalDates: number;
  generated: number;
  skipped: Array<{ date: string; reason: string }>;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// QUESTION
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// CATEGORY / ROOM
// ═══════════════════════════════════════════════════════════════
export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number;
  parentName?: string;
  isActive: boolean;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomResponse {
  id: number;
  code?: string;
  name: string;
  capacity?: number;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// REQUEST PAYLOADS
// ═══════════════════════════════════════════════════════════════
export interface CourseCreateRequest {
  title: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  outcomes?: string[];
  price: number;
  oldPrice?: number;
  isFree?: boolean;
  courseType: CourseType;
  categoryId?: number;
  teacherId?: number;
  roomId?: number;
  learningMode?: LearningMode;
  allowedRoomIds?: number[];
}

export interface CourseUpdateRequest {
  title?: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  outcomes?: string[];
  price?: number;
  oldPrice?: number;
  isFree?: boolean;
  categoryId?: number;
  roomId?: number;
  learningMode?: LearningMode;
  allowedRoomIds?: number[];
}

export interface CourseOfflineInfoRequest {
  minStudents: number;
  maxStudents: number;
  startDate: string;
  endDate: string;
  scheduleDays: number[];
  sessionStartTime: string;
  sessionEndTime: string;
  teacherId?: number;
  roomId?: number;
}

export interface CourseReviewRequest {
  approved: boolean;
  rejectReason?: string;
}

export interface CourseCopyRequest {
  newTitle: string;
  newDisplayCode: string;
  resetPrice?: boolean;
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

export interface QuizCreateRequest {
  title: string;
  quizType?: QuizCategory;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  shuffleQuestions?: boolean;
  totalQuestions?: number;
  hashtagFilter?: string;
  availableFrom?: string;
  availableUntil?: string;
  parentId?: number;
}

export interface QuizSubmitRequest {
  attemptId: number;
  answers: string;
}