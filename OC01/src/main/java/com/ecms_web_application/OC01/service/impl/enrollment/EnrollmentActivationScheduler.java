package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.EnrollmentStatusLog;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.EnrollmentStatusLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class EnrollmentActivationScheduler {
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentStatusLogRepository statusLogRepository;
    private final CourseRepository courseRepository;

    @Scheduled(cron = "0 5 1 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void activateStartedOfflineEnrollments() {
        int activated = 0;
        for (Enrollment enrollment : enrollmentRepository.findByStatus(EnrollmentStatus.PENDING)) {
            Course course = courseRepository.findById(enrollment.getCourseId()).orElse(null);
            if (course == null || course.getCourseType() != CourseType.OFFLINE
                    || course.getStartDate() == null || course.getStartDate().isAfter(LocalDate.now())) {
                continue;
            }
            enrollment.setStatus(EnrollmentStatus.ACTIVE);
            enrollment.setUpdatedAt(java.time.LocalDateTime.now());
            enrollmentRepository.save(enrollment);

            EnrollmentStatusLog logEntry = new EnrollmentStatusLog();
            logEntry.setEnrollmentId(enrollment.getId());
            logEntry.setOldStatus(EnrollmentStatus.PENDING);
            logEntry.setNewStatus(EnrollmentStatus.ACTIVE);
            logEntry.setReason("Tự động kích hoạt khi khóa học đến ngày khai giảng");
            statusLogRepository.save(logEntry);
            activated++;
        }
        if (activated > 0) log.info("Activated {} offline enrollments on course start date", activated);
    }
}
