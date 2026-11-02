package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Scheduler tự động chuyển COURSE:
 *   PUBLISHED → ONGOING khi đã đạt MIN_STUDENTS + tới ngày khai giảng.
 *
 * Spec State Transition dòng 7:
 *   "Khi COURSE đã đạt MIN_STUDENTS và thời gian thực tế đã đến ngày khai giảng,
 *    COURSE_SYSTEM tự động đóng cổng đăng ký và kích hoạt tính năng theo dõi PROGRESS."
 *
 * Chạy 00:05 mỗi ngày (Asia/Ho_Chi_Minh).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CourseActivationScheduler {

    private final CourseRepository courseRepository;

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void activateStartedCourses() {
        LocalDate today = LocalDate.now();
        int activated = 0;

        for (Course c : courseRepository.findByStatus(CourseStatus.PUBLISHED)) {
            if (c.getStartDate() == null || c.getStartDate().isAfter(today)) continue;

            int current = c.getCurrentStudents() != null ? c.getCurrentStudents() : 0;
            int min = c.getMinStudents() != null ? c.getMinStudents() : 0;

            if (min > 0 && current >= min) {
                c.setStatus(CourseStatus.ONGOING);
                courseRepository.save(c);
                activated++;
                log.info("[CourseActivation] PUBLISHED → ONGOING: courseId={}, current={}, min={}",
                        c.getId(), current, min);
            } else {
                // Không đủ min → log cảnh báo (manual CANCELLED nếu cần)
                log.warn("[CourseActivation] Course {} tới ngày khai giảng nhưng chưa đủ min (current={}, min={})",
                        c.getId(), current, min);
            }
        }
        if (activated > 0) log.info("[CourseActivation] Đã kích hoạt {} khóa học", activated);
    }
}