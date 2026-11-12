package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.CertificateStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Chứng chỉ do trung tâm cấp cho học viên sau khi hoàn thành khóa OFFLINE.
 * Mỗi ghi danh chỉ có tối đa một chứng chỉ. Bảng: certificates
 */
@Getter
@Setter
@Entity
@Table(name = "certificates", uniqueConstraints = {
        @UniqueConstraint(name = "uk_certificates_code", columnNames = "certificate_code"),
        @UniqueConstraint(name = "uk_certificates_enrollment", columnNames = "enrollment_id")
})
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "certificate_id")
    private Long id;

    @Column(name = "certificate_code", nullable = false, length = 40)
    private String certificateCode;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "student_code", length = 20)
    private String studentCode;

    @Column(name = "student_name", nullable = false, length = 255)
    private String studentName;

    @Column(name = "course_title", nullable = false, length = 255)
    private String courseTitle;

    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CertificateStatus status = CertificateStatus.ISSUED;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "original_file_name", length = 255)
    private String originalFileName;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private LocalDateTime issuedAt;

    @Column(name = "issued_by", nullable = false)
    private Long issuedBy;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "revoked_by")
    private Long revokedBy;

    @Column(name = "revoke_reason", columnDefinition = "text")
    private String revokeReason;

    @PrePersist
    void onCreate() {
        if (issuedAt == null) issuedAt = LocalDateTime.now();
        if (status == null) status = CertificateStatus.ISSUED;
    }
}
