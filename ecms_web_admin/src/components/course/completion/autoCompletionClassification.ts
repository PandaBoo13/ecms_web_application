export type CompletionSuggestion = 'PASSED' | 'FAILED';

export interface AttendanceSummaryLike {
  present: number;
  absent: number;
  excused: number;
  notMarked: number;
  absencePercent: number;
}

export interface AttendanceMatrixLike {
  rules?: { maxAbsencePercent: number } | null;
  students?: Array<{ enrollmentId: number; summary?: AttendanceSummaryLike | null }> | null;
}

export interface CompletionCandidate {
  enrollmentId: number;
  studentCode?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  finalScore?: number | null;
}

export interface ClassifiedStudent {
  enrollmentId: number;
  studentCode: string;
  studentName: string;
  studentEmail: string;
  finalScore: number | null;
  conductedSessions: number;
  absences: number;
  absencePercent: number;
  unmarkedSessions: number;
  suggestedResult: CompletionSuggestion;
  eligible: boolean;
  reason: string;
}

/** Khớp mặc định BE (app.attendance.max-absence-percent). */
export const DEFAULT_MAX_ABSENCE_PERCENT = 30;

export function resolveMaxAbsencePercent(matrix: AttendanceMatrixLike | null): number {
  return matrix?.rules?.maxAbsencePercent ?? DEFAULT_MAX_ABSENCE_PERCENT;
}

/** Phân loại ĐẠT/KHÔNG ĐẠT theo số liệu điểm danh BE đã tính sẵn trong ma trận. */
export function classifyCompletionStudents(params: {
  students: CompletionCandidate[];
  matrix: AttendanceMatrixLike | null;
  isOnline: boolean;
  defaultPassScore: number;
  maxAbsencePercent: number;
}): ClassifiedStudent[] {
  const { students, matrix, isOnline, defaultPassScore, maxAbsencePercent } = params;

  return students.map((s) => {
    const summary = matrix?.students?.find((m) => m.enrollmentId === s.enrollmentId)?.summary;
    const absences = summary?.absent ?? 0;
    const unmarked = summary?.notMarked ?? 0;
    const absencePct = summary?.absencePercent ?? 0;
    // Tổng buổi áp dụng cho HV, khớp công thức ngưỡng của BE (conducted + applicable).
    const conductedForStudent = summary
      ? summary.present + summary.absent + summary.excused + summary.notMarked
      : 0;
    const score = s.finalScore;

    let eligible = true;
    let reason = '';
    let suggestedResult: CompletionSuggestion = 'FAILED';

    if (score === null || score === undefined) {
      eligible = false;
      reason = 'Chưa có điểm cuối khóa';
    } else if (!isOnline && unmarked > 0) {
      eligible = false;
      reason = `Còn ${unmarked} buổi chưa điểm danh`;
    } else {
      const isScorePass = score >= defaultPassScore;
      const isAttendancePass = isOnline || absencePct <= maxAbsencePercent;
      if (isScorePass && isAttendancePass) {
        suggestedResult = 'PASSED';
        reason = 'Đủ điều kiện (Điểm đạt & Chuyên cần đạt)';
      } else {
        suggestedResult = 'FAILED';
        if (!isScorePass && !isAttendancePass) {
          reason = `Điểm ${score} (< ${defaultPassScore}) & vắng ${absencePct.toFixed(1)}% (> ${maxAbsencePercent}%)`;
        } else if (!isScorePass) {
          reason = `Điểm ${score} (< ${defaultPassScore})`;
        } else {
          reason = `Vắng ${absences}/${conductedForStudent} buổi (${absencePct.toFixed(1)}% > ${maxAbsencePercent}%)`;
        }
      }
    }

    return {
      enrollmentId: s.enrollmentId,
      studentCode: s.studentCode || '—',
      studentName: s.studentName || `Ghi danh #${s.enrollmentId}`,
      studentEmail: s.studentEmail || '—',
      finalScore: score ?? null,
      conductedSessions: conductedForStudent,
      absences,
      absencePercent: absencePct,
      unmarkedSessions: unmarked,
      suggestedResult,
      eligible,
      reason,
    };
  });
}
