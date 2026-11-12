package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.AttendanceRecord;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.entity.enums.AttendanceStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceRecordResponse(
        Long attendanceId,
        Long enrollmentId,
        Long sessionId,
        Integer sessionNumber,
        String sessionTitle,
        LocalDate sessionDate,
        LocalDateTime sessionStartTime,
        AttendanceStatus status,
        LocalDateTime checkInAt,
        String note,
        String studentName,
        String studentCode,
        LocalDateTime markedAt,
        Long markedBy,
        LocalDateTime updatedAt,
        Long updatedBy
) {
    public static AttendanceRecordResponse from(AttendanceRecord record, Session session, Student student) {
        return new AttendanceRecordResponse(
                record.getId(), record.getEnrollmentId(), record.getSessionId(),
                session == null ? null : session.getSessionNumber(),
                session == null ? null : session.getTitle(),
                session == null ? null : session.getSessionDate(),
                session == null ? null : session.getStartTime(),
                record.getStatus(), record.getCheckInAt(), record.getNote(),
                student == null ? null : student.getFullName(),
                student == null ? null : student.getStudentCode(),
                record.getMarkedAt(), record.getMarkedBy(), record.getUpdatedAt(), record.getUpdatedBy());
    }
}
