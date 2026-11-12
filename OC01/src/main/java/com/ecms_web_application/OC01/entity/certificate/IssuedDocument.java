package com.ecms_web_application.OC01.entity.certificate;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@Entity
@Table(name = "issued_document")
public class IssuedDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_kind", nullable = false, length = 20)
    private String documentKind; // CERTIFICATE | TRANSCRIPT

    @Column(name = "document_no", nullable = false, unique = true, length = 50)
    private String documentNo;

    @Column(name = "certificate_type_id")
    private Long certificateTypeId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private LocalDateTime issuedAt;

    @Column(name = "issued_by")
    private Long issuedBy;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ISSUED"; // ISSUED | REVOKED

    @Column(name = "pdf_url", length = 500)
    private String pdfUrl;

    @Column(name = "verification_code", nullable = false, unique = true, length = 64)
    private String verificationCode;

    @Column(name = "verification_hash", nullable = false, length = 128)
    private String verificationHash;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_data", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> snapshotData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "scores", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> scores;

    @Column(name = "cefr_level", length = 5)
    private String cefrLevel;

    @Column(name = "overall_result", length = 20)
    private String overallResult;

    @Column(name = "template_html", columnDefinition = "TEXT")
    private String templateHtml;

    @Column(name = "template_css", columnDefinition = "TEXT")
    private String templateCss;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "revoked_reason", columnDefinition = "TEXT")
    private String revokedReason;

    @Column(name = "revoked_by")
    private Long revokedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (issuedAt == null) issuedAt = LocalDateTime.now();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = "ISSUED";
    }
}
