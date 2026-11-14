package com.ecms_web_application.OC01.dto.response.enrollment;

import java.util.List;

public record SessionAttendanceResponse(
        Long courseId,
        Long sessionId,
        List<AttendanceRecordResponse> records
) { }
