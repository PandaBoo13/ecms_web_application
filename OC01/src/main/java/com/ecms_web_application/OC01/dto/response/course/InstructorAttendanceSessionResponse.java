package com.ecms_web_application.OC01.dto.response.course;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record InstructorAttendanceSessionResponse(
        Long sessionId,
        Long courseId,
        String courseCode,
        String courseTitle,
        Integer sessionNumber,
        String sessionTitle,
        LocalDate sessionDate,
        LocalDateTime startTime,
        LocalDateTime endTime,
        String status) {
}
