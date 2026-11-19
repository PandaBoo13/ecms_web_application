import type { CourseResponse } from '@/services/types/course';

export const DEFAULT_MAX_FINAL_SCORE = 100;
export const TOEIC_MAX_FINAL_SCORE = 990;

type ScoreScaleCourse = Pick<
  CourseResponse,
  'maxFinalScore' | 'code' | 'displayCode' | 'title' | 'categoryName'
>;

/**
 * Backend trả maxFinalScore; fallback cho bản API cũ: khóa TOEIC chấm thang 990.
 */
export const resolveMaxFinalScore = (course?: ScoreScaleCourse | null): number => {
  if (!course) return DEFAULT_MAX_FINAL_SCORE;
  if (course.maxFinalScore) return course.maxFinalScore;
  return [course.code, course.displayCode, course.title, course.categoryName]
    .some((value) => value?.toUpperCase().includes('TOEIC'))
    ? TOEIC_MAX_FINAL_SCORE
    : DEFAULT_MAX_FINAL_SCORE;
};
