package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "enrollments", uniqueConstraints =
        @UniqueConstraint(name = "uk_enrollments_invoice", columnNames = "invoice_id"))
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "enrollment_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "enrollment_type", nullable = false, columnDefinition = "enrollment_type")
    private EnrollmentType enrollmentType = EnrollmentType.OFFLINE;

    @Column(name = "account_id")
    private Long accountId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "invoice_id", nullable = false, unique = true)
    private Long invoiceId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "enrollment_status")
    private EnrollmentStatus status = EnrollmentStatus.PENDING;

    @Column(name = "enrolled_at", nullable = false, updatable = false)
    private LocalDateTime enrolledAt;

    @Column(name = "enrolled_by", nullable = false)
    private Long enrolledBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "hold_reason", columnDefinition = "text")
    private String holdReason;

    @Column(name = "hold_start_date")
    private LocalDate holdStartDate;

    @Column(name = "hold_end_date")
    private LocalDate holdEndDate;

    @Column(name = "actual_return_date")
    private LocalDate actualReturnDate;

    @Column(name = "hold_processed_by")
    private Long holdProcessedBy;

    @Column(name = "termination_reason", columnDefinition = "text")
    private String terminationReason;

    @Column(name = "terminated_at")
    private LocalDateTime terminatedAt;

    @Column(name = "terminated_by")
    private Long terminatedBy;

    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;

    @Column(name = "score_recorded_at")
    private LocalDateTime scoreRecordedAt;

    @Column(name = "score_recorded_by")
    private Long scoreRecordedBy;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completed_by")
    private Long completedBy;

    @PrePersist
    void onCreate() {
        if (enrolledAt == null) enrolledAt = LocalDateTime.now();
    }
}
