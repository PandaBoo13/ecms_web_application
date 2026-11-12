package com.ecms_web_application.OC01.dto.response.certificate;

import com.ecms_web_application.OC01.entity.Certificate;
import com.ecms_web_application.OC01.entity.enums.CertificateStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CertificateResponse(
        Long certificateId,
        String certificateCode,
        Long enrollmentId,
        Long studentId,
        String studentCode,
        String studentName,
        Long courseId,
        String courseTitle,
        BigDecimal finalScore,
        LocalDateTime completedAt,
        CertificateStatus status,
        LocalDateTime issuedAt,
        Long issuedBy,
        LocalDateTime revokedAt,
        Long revokedBy,
        String revokeReason
) {
    public static CertificateResponse from(Certificate certificate) {
        return new CertificateResponse(
                certificate.getId(),
                certificate.getCertificateCode(),
                certificate.getEnrollmentId(),
                certificate.getStudentId(),
                certificate.getStudentCode(),
                certificate.getStudentName(),
                certificate.getCourseId(),
                certificate.getCourseTitle(),
                certificate.getFinalScore(),
                certificate.getCompletedAt(),
                certificate.getStatus(),
                certificate.getIssuedAt(),
                certificate.getIssuedBy(),
                certificate.getRevokedAt(),
                certificate.getRevokedBy(),
                certificate.getRevokeReason()
        );
    }
}
