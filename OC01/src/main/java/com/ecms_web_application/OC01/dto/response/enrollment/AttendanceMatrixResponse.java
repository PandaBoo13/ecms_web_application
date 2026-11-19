package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Ma trận điểm danh của một khóa OFFLINE: học viên × buổi học.
 * Chỉ các buổi không bị hủy được trả về.
 */
public record AttendanceMatrixResponse(
        Long courseId,
        String courseCode,
        String courseTitle,
        int conductedSessions,
        List<SessionColumn> sessions,
        List<StudentRow> students,
        Rules rules
) {
    public record SessionColumn(
            Long sessionId,
            Integer sessionNumber,
            String title,
            LocalDate sessionDate,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String status,
            boolean editable,
            String lockReason,
            LocalDateTime editDeadline
    ) { }

    public record StudentRow(
            Long enrollmentId,
            Long studentId,
            String studentCode,
            String studentName,
            String email,
            EnrollmentStatus enrollmentStatus,
            Map<Long, Cell> cells,
            Summary summary
    ) { }

    public record Cell(
            Long attendanceId,
            String status,
            String note,
            Long leaveRequestId,
            String leaveRequestStatus,
            String leaveRequestReason
    ) { }

    /**
     * Thống kê trên các buổi đã kết thúc và học viên thực sự thuộc diện điểm danh
     * (đã ghi danh trước khi buổi kết thúc, không bảo lưu tại buổi đó).
     */
    public record Summary(
            int present,
            int absent,
            int excused,
            int notMarked,
            double absencePoints,
            double absencePercent
    ) { }

    public record Rules(
            double maxAbsencePercent
    ) { }
}
