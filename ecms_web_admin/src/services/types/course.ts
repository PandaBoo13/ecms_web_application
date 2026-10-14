export type CourseType = 'ONLINE' | 'OFFLINE';
export type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED' | 'CANCELLED';
export type ClassStatus = 'PLANNED' | 'OPEN' | 'ONGOING' | 'FINISHED' | 'CANCELLED';
export type ProgressType = 'COMPLETION_BASED' | 'SESSION_BASED';
export type ResourceType =
  | 'CHAPTER' | 'LESSON' | 'VIDEO' | 'PDF' | 'SLIDE' | 'AUDIO'
  | 'QUIZ' | 'ASSIGNMENT' | 'LINK' | 'DOCUMENT' | 'IMAGE';
export type ResourceStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
export type QuizCategory = 'OPTIONAL' | 'MANDATORY';
export type SessionStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED' | 'RESCHEDULED';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type QuestionStatus = 'ACTIVE' | 'INACTIVE';

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
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  id: number;
  courseId: number;
  sessionNumber: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  teacherId?: number;
  teacherName?: string;
  assistantId?: number;
  assistantName?: string;
  roomId?: number;
  roomName?: string;
  status: SessionStatus;
  cancelReason?: string;
  note?: string;
  rescheduledFromId?: number;
  createdAt: string;
  updatedAt: string;
}

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
}

export interface CourseUpdateRequest extends Partial<CourseCreateRequest> {}