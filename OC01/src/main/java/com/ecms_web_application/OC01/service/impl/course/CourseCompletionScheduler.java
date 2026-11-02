package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.event.CourseFinishedEvent;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler tự động chuyển COURSE ONGOING → FINISHED + phát CourseFinishedEvent.
 *
 * Spec State Transition dòng 9:
 *   "Khi buổi SESSION cuối cùng kết thúc (OFFLINE) hoặc hết thời hạn học (ONLINE),
 *    COURSE_SYSTEM tự động khóa sổ điểm danh và đẩy dữ liệu kết quả sang STUDENT_MODULE
 *    để ghi vào ACADEMIC_HISTORIES."
 *
 * Chạy 00:10 mỗi ngày (Asia/Ho_Chi_Minh).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CourseCompletionScheduler {

    private final CourseRepository courseRepository;
    private final SessionRepository sessionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(cron = "0 10 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void finishEndedCourses() {
        LocalDate today = LocalDate.now();
        int finished = 0;

        for (Course c : courseRepository.findByStatus(CourseStatus.ONGOING)) {
            boolean ended;
            if (c.getCourseType() == CourseType.OFFLINE) {
                long total = sessionRepository.countByCourse_Id(c.getId());
                long done = sessionRepository.countDoneSessions(c.getId());
                ended = (total > 0 && total == done)
                        || (c.getEndDate() != null && c.getEndDate().isBefore(today));
            } else {
                ended = c.getEndDate() != null && c.getEndDate().isBefore(today);
            }

            if (ended) {
                c.setStatus(CourseStatus.FINISHED);
                courseRepository.save(c);

                // Lấy danh sách student ACTIVE để đẩy event
                List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(
                        c.getId(), EnrollmentStatus.ACTIVE);
                List<Long> studentIds = enrollments.stream()
                        .map(Enrollment::getStudentId)
                        .filter(java.util.Objects::nonNull)
                        .toList();

                eventPublisher.publishEvent(new CourseFinishedEvent(
                        c.getId(), studentIds, LocalDateTime.now()));

                finished++;
                log.info("[CourseCompletion] ONGOING → FINISHED: courseId={}, students={}",
                        c.getId(), studentIds.size());
            }
        }
        if (finished > 0) log.info("[CourseCompletion] Đã kết thúc {} khóa học", finished);
    }
}