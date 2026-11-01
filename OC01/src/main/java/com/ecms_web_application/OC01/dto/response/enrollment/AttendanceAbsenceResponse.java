package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.AttendanceAbsence;

import java.time.LocalDateTime;

public record AttendanceAbsenceResponse(
        Long attendanceId,
        Long enrollmentId,
        Long sessionId,
        LocalDateTime createdAt,
        Long createdBy
) {
    public static AttendanceAbsenceResponse from(AttendanceAbsence absence) {
        return new AttendanceAbsenceResponse(absence.getId(), absence.getEnrollmentId(),
                absence.getSessionId(), absence.getCreatedAt(), absence.getCreatedBy());
    }
}
