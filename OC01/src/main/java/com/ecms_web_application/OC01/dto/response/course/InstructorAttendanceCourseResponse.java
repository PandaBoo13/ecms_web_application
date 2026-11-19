package com.ecms_web_application.OC01.dto.response.course;

import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import java.time.LocalDate;

public record InstructorAttendanceCourseResponse(
        Long courseId,
        String courseCode,
        String courseTitle,
        int assignedSessionCount,
        CourseStatus courseStatus,
        LocalDate startDate,
        LocalDate endDate,
        boolean isFinished
) {
    public InstructorAttendanceCourseResponse(
            Long courseId,
            String courseCode,
            String courseTitle,
            int assignedSessionCount
    ) {
        this(courseId, courseCode, courseTitle, assignedSessionCount, null, null, null, false);
    }
}
