package com.ecms_web_application.OC01.event;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Phát ra khi COURSE chuyển ONGOING → FINISHED.
 * Dùng để đồng bộ sang STUDENT_MODULE (ACADEMIC_HISTORIES) + notification.
 */
public record CourseFinishedEvent(
        Long courseId,
        List<Long> studentIds,
        LocalDateTime finishedAt
) { }