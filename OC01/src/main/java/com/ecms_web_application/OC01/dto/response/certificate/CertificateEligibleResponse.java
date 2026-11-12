package com.ecms_web_application.OC01.dto.response.certificate;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Một ghi danh OFFLINE đã hoàn thành nhưng chưa được cấp chứng chỉ. */
public record CertificateEligibleResponse(
        Long enrollmentId,
        Long studentId,
        String studentCode,
        String studentName,
        String studentEmail,
        String studentPhone,
        Long courseId,
        String courseTitle,
        BigDecimal finalScore,
        LocalDateTime completedAt
) {
}
