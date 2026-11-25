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
        LocalDateTime sessionEndTime,
        AttendanceStatus status,
        String note,
        String studentName,
        String studentCode,
        LocalDateTime markedAt,
        Long markedBy,
        LocalDateTime updatedAt,
        Long updatedBy,
        // Đơn xin nghỉ phép (LEAVE_FEEDBACK request) liên kết với bản ghi này
        Long leaveRequestId,
        String leaveRequestStatus,
        String leaveRequestReason
) {
    public static AttendanceRecordResponse from(AttendanceRecord record, Session session, Student student) {
        return new AttendanceRecordResponse(
                record.getId(), record.getEnrollmentId(), record.getSessionId(),
                session == null ? null : session.getSessionNumber(),
                session == null ? null : session.getTitle(),
                session == null ? null : session.getSessionDate(),
                session == null ? null : session.getStartTime(),
                session == null ? null : session.getEndTime(),
                record.getStatus(), record.getNote(),
                student == null ? null : student.getFullName(),
                student == null ? null : student.getStudentCode(),
                record.getMarkedAt(), record.getMarkedBy(), record.getUpdatedAt(), record.getUpdatedBy(),
                null, null, null);
    }

    public static AttendanceRecordResponse from(AttendanceRecord record, Session session, Student student,
            Long leaveRequestId, String leaveRequestStatus, String leaveRequestReason) {
        return new AttendanceRecordResponse(
                record.getId(), record.getEnrollmentId(), record.getSessionId(),
                session == null ? null : session.getSessionNumber(),
                session == null ? null : session.getTitle(),
                session == null ? null : session.getSessionDate(),
                session == null ? null : session.getStartTime(),
                session == null ? null : session.getEndTime(),
                record.getStatus(), record.getNote(),
                student == null ? null : student.getFullName(),
                student == null ? null : student.getStudentCode(),
                record.getMarkedAt(), record.getMarkedBy(), record.getUpdatedAt(), record.getUpdatedBy(),
                leaveRequestId, leaveRequestStatus, leaveRequestReason);
    }
}
