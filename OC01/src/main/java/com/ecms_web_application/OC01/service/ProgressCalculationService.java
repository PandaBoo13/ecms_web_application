package com.ecms_web_application.OC01.service;

/**
 * Tính toán progress % ở cấp COURSE.
 *
 * Công thức:
 *   COMPLETION_BASED (Online) : completed required units (không tính CHAPTER/LESSON) / total required units
 *   SESSION_BASED    (Offline): DONE sessions / sessions != CANCELLED
 *
 * Nguyên tắc:
 *   - % không bao giờ giảm (giữ max giữa mới và cũ)
 *   - hasUncompletedNewContent = true khi HV đã từng 100% nhưng hiện chưa hoàn thành hết required units
 */
public interface ProgressCalculationService {

    /** Batch toàn bộ học viên có Progress COURSE trong khóa. */
    void recalculateForCourse(Long courseId);

    /** 1 học viên cụ thể; tạo Progress COURSE nếu chưa có. */
    void recalculateForStudent(Long accountId, Long courseId);

    /** Hook khi resource thay đổi (create/update/delete). */
    void onResourceChanged(Long courseId);

    /** Hook khi session thay đổi (DONE/CANCELLED/RESCHEDULED). */
    void onSessionChanged(Long courseId);

    /** Hook khi quiz được chấm (pass). */
    void onQuizGraded(Long accountId, Long courseId);
}