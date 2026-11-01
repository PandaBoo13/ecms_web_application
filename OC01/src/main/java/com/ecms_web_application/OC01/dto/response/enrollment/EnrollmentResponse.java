package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record EnrollmentResponse(
        Long enrollmentId,
        EnrollmentType enrollmentType,
        Long accountId,
        Long studentId,
        Long courseId,
        Long invoiceId,
        EnrollmentStatus status,
        LocalDateTime enrolledAt,
        Long enrolledBy,
        LocalDateTime updatedAt,
        Long updatedBy,
        String holdReason,
        LocalDate holdStartDate,
        LocalDate holdEndDate,
        LocalDate actualReturnDate,
        Long holdProcessedBy,
        String terminationReason,
        LocalDateTime terminatedAt,
        Long terminatedBy,
        BigDecimal finalScore,
        LocalDateTime scoreRecordedAt,
        Long scoreRecordedBy,
        LocalDateTime completedAt,
        Long completedBy,
        long absences
) {
    public static EnrollmentResponse from(Enrollment e, long absences) {
        return new EnrollmentResponse(e.getId(), e.getEnrollmentType(), e.getAccountId(),
                e.getStudentId(), e.getCourseId(), e.getInvoiceId(), e.getStatus(),
                e.getEnrolledAt(), e.getEnrolledBy(), e.getUpdatedAt(), e.getUpdatedBy(),
                e.getHoldReason(), e.getHoldStartDate(), e.getHoldEndDate(), e.getActualReturnDate(),
                e.getHoldProcessedBy(), e.getTerminationReason(), e.getTerminatedAt(),
                e.getTerminatedBy(), e.getFinalScore(), e.getScoreRecordedAt(),
                e.getScoreRecordedBy(), e.getCompletedAt(), e.getCompletedBy(), absences);
    }
}
