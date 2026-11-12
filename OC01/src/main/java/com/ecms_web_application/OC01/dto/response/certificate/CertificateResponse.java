package com.ecms_web_application.OC01.dto.response.certificate;

import com.ecms_web_application.OC01.entity.certificate.IssuedDocument;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Response cho chứng chỉ — map từ IssuedDocument.
 * Giữ cùng shape với DTO cũ để FE không phải đổi.
 */
public record CertificateResponse(
        Long certificateId,
        String certificateCode,       // = verificationCode
        String documentNo,
        Long enrollmentId,
        Long studentId,
        String studentCode,
        String studentName,
        Long courseId,
        String courseTitle,
        BigDecimal finalScore,
        LocalDateTime completedAt,
        String status,                // "ISSUED" | "REVOKED"
        LocalDateTime issuedAt,
        Long issuedBy,
        LocalDateTime revokedAt,
        Long revokedBy,
        String revokeReason,
        String pdfUrl,
        String cefrLevel,
        String overallResult
) {
    public static CertificateResponse from(IssuedDocument d) {
        Map<String, Object> snap = d.getSnapshotData() == null ? Map.of() : d.getSnapshotData();
        Map<String, Object> sc   = d.getScores()       == null ? Map.of() : d.getScores();

        return new CertificateResponse(
                d.getId(),
                d.getVerificationCode(),
                d.getDocumentNo(),
                d.getEnrollmentId(),
                d.getStudentId(),
                str(snap.get("studentCode")),
                str(snap.get("studentName")),
                d.getCourseId(),
                str(snap.get("courseTitle")),
                toBigDecimal(sc.get("finalScore")),
                toLocalDateTime(snap.get("completedAt")),
                d.getStatus(),
                d.getIssuedAt(),
                d.getIssuedBy(),
                d.getRevokedAt(),
                d.getRevokedBy(),
                d.getRevokedReason(),
                d.getPdfUrl(),
                d.getCefrLevel(),
                d.getOverallResult()
        );
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(o.toString()); } catch (Exception e) { return null; }
    }

    private static LocalDateTime toLocalDateTime(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDateTime t) return t;
        try { return LocalDateTime.parse(o.toString()); } catch (Exception e) { return null; }
    }
}