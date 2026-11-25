package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.CompletionResult;
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
        boolean scorePublished,
        LocalDateTime scoreRecordedAt,
        Long scoreRecordedBy,
        LocalDateTime completedAt,
        Long completedBy,
        CompletionResult completionResult,
        long absences,
        String studentName,
        String studentCode,
        String studentEmail,
        String studentPhone,
        String courseTitle,
        String courseCode,
        String invoiceCode,
        boolean completionEligible,
        String completionBlockedReason
) {
    public static EnrollmentResponse from(Enrollment e, EnrollmentType enrollmentType, Long accountId,
                                          long absences) {
        return from(e, enrollmentType, accountId, absences, null, null, null, null, null, null);
    }

    public static EnrollmentResponse from(Enrollment e, EnrollmentType enrollmentType, Long accountId,
                                          long absences,
                                          String studentName, String studentCode,
                                          String studentEmail, String studentPhone,
                                          String courseTitle, String invoiceCode) {
        return from(e, enrollmentType, accountId, absences, studentName, studentCode, studentEmail, studentPhone,
                courseTitle, invoiceCode, false, null);
    }

    public static EnrollmentResponse from(Enrollment e, EnrollmentType enrollmentType, Long accountId,
                                          long absences,
                                          String studentName, String studentCode,
                                          String studentEmail, String studentPhone,
                                          String courseTitle, String invoiceCode,
                                          boolean completionEligible, String completionBlockedReason) {
        return from(e, enrollmentType, accountId, absences, studentName, studentCode,
                studentEmail, studentPhone, courseTitle, null, invoiceCode,
                completionEligible, completionBlockedReason);
    }

    public static EnrollmentResponse from(Enrollment e, EnrollmentType enrollmentType, Long accountId,
                                          long absences,
                                          String studentName, String studentCode,
                                          String studentEmail, String studentPhone,
                                          String courseTitle, String courseCode, String invoiceCode,
                                          boolean completionEligible, String completionBlockedReason) {
        return from(e, enrollmentType, accountId, absences, studentName, studentCode,
                studentEmail, studentPhone, courseTitle, courseCode, invoiceCode,
                completionEligible, completionBlockedReason, false);
    }

    public static EnrollmentResponse from(Enrollment e, EnrollmentType enrollmentType, Long accountId,
                                          long absences,
                                          String studentName, String studentCode,
                                          String studentEmail, String studentPhone,
                                          String courseTitle, String courseCode, String invoiceCode,
                                          boolean completionEligible, String completionBlockedReason,
                                          boolean hideScore) {
        BigDecimal score = hideScore ? null : e.getFinalScore();
        LocalDateTime scoreRecordedAt = hideScore ? null : e.getScoreRecordedAt();
        Long scoreRecordedBy = hideScore ? null : e.getScoreRecordedBy();
        return new EnrollmentResponse(
                e.getId(), enrollmentType, accountId,
                e.getStudentId(), e.getCourseId(), e.getInvoiceId(), e.getStatus(),
                e.getEnrolledAt(), e.getEnrolledBy(), e.getUpdatedAt(), e.getUpdatedBy(),
                e.getHoldReason(), e.getHoldStartDate(), e.getHoldEndDate(), e.getActualReturnDate(),
                e.getHoldProcessedBy(), e.getTerminationReason(), e.getTerminatedAt(),
                e.getTerminatedBy(), score, !hideScore, scoreRecordedAt,
                scoreRecordedBy, e.getCompletedAt(), e.getCompletedBy(), e.getCompletionResult(), absences,
                studentName, studentCode, studentEmail, studentPhone, courseTitle, courseCode, invoiceCode,
                completionEligible, completionBlockedReason);
    }
}
