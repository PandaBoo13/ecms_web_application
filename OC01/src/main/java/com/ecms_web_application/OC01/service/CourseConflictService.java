package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.response.course.CourseConflictDetail;
import com.ecms_web_application.OC01.entity.course.Course;

import java.util.List;

/**
 * Check conflict lịch giữa course với các course OFFLINE đang active.
 *
 * 2 TẦNG:
 *  - Tầng 1 (checkCourseConflict)  : dùng config lịch — gọi ở onApprove (PENDING → PLANNED)
 *  - Tầng 2 (checkSessionConflict) : dùng session đã có — gọi ở finalizeSchedule (PLANNED → PUBLISHED)
 */
public interface CourseConflictService {

    /** Check tầng 1 — config lịch (chưa có session). */
    List<CourseConflictDetail> checkCourseConflict(Course course);

    /** Check tầng 2 — session cụ thể (đã có room/teacher gán). */
    List<CourseConflictDetail> checkSessionConflict(Long courseId);
}