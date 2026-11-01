package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity đại diện cho Lead (Khách hàng tiềm năng).
 * Bảng: leads
 */
@Getter
@Setter
@Entity
@Table(name = "leads")
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "NEW";

    @Column(name = "consulted_at")
    private LocalDateTime consultedAt;

    @Column(name = "converted_at")
    private LocalDateTime convertedAt;

    @Column(name = "source_name", nullable = false, length = 255)
    private String sourceName = "Website";

    @Column(name = "channel_type", nullable = false, length = 50)
    private String channelType = "ONLINE";

    @Column(name = "assigned_consultant_id")
    private Long assignedConsultantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "placement_test_status", length = 50)
    private String placementTestStatus;

    @Column(name = "placement_test_score", precision = 5, scale = 2)
    private BigDecimal placementTestScore;

    @Column(name = "placement_recommended_level", length = 100)
    private String placementRecommendedLevel;

    @Column(name = "placement_test_notes", columnDefinition = "TEXT")
    private String placementTestNotes;

    @Column(name = "placement_evaluated_at")
    private LocalDateTime placementEvaluatedAt;

    @Column(name = "placement_test_created_at")
    private LocalDateTime placementTestCreatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "interactions", columnDefinition = "jsonb", nullable = false)
    private List<LeadInteraction> interactions = new ArrayList<>();

    // Backward compatibility for sourceId getter/setter
    @Transient
    private Long sourceId;

    // ===== Hooks =====
    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.status == null || this.status.isBlank()) this.status = "NEW";

        // Check constraint: status = 'NEW' -> consulted_at must be NULL; status = 'CONSULTED' -> consulted_at must not be NULL
        if ("CONSULTED".equalsIgnoreCase(this.status)) {
            if (this.consultedAt == null) this.consultedAt = now;
        } else {
            this.status = "NEW";
            this.consultedAt = null;
        }

        if (this.sourceName == null || this.sourceName.isBlank()) this.sourceName = "Website";
        if (this.channelType == null || this.channelType.isBlank()) this.channelType = "ONLINE";
        if (this.interactions == null) this.interactions = new ArrayList<>();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if ("CONSULTED".equalsIgnoreCase(this.status)) {
            if (this.consultedAt == null) this.consultedAt = LocalDateTime.now();
        } else {
            this.status = "NEW";
            this.consultedAt = null;
        }
        if (this.interactions == null) this.interactions = new ArrayList<>();
    }
}
