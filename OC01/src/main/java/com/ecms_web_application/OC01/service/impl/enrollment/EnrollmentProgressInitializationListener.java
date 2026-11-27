package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.event.EnrollmentCreatedEvent;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Initializes learner progress after enrollment has committed, independently of enrollment creation. */
@Slf4j
@Component
@RequiredArgsConstructor
public class EnrollmentProgressInitializationListener {
    private final EnrollmentRepository enrollmentRepository;
    private final ProgressCalculationService progressCalculationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void initializeProgress(EnrollmentCreatedEvent event) {
        try {
            enrollmentRepository.findById(event.enrollmentId()).ifPresent(enrollment ->
                    progressCalculationService.recalculateForEnrollment(
                            enrollment.getId(), enrollment.getCourseId()));
        } catch (Exception ex) {
            // Progress initialization must never roll back an already committed paid enrollment.
            log.error("Không thể khởi tạo tiến độ cho ghi danh {}: {}",
                    event.enrollmentId(), ex.getMessage(), ex);
        }
    }
}
