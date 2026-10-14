package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.ProgressScope;
import com.ecms_web_application.OC01.entity.enums.ProgressStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Setter @Getter
@Entity
@Table(name = "progress",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_progress",
        columnNames = {"account_id", "course_id", "progress_type", "reference_id"}))
public class Progress {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false) private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false) private Course course;

    @Enumerated(EnumType.STRING)
    @Column(name = "progress_type", nullable = false, length = 50)
    private ProgressScope progressType;

    @Column(name = "reference_id") private Long referenceId;
    @Column(name = "reference_type", length = 50) private String referenceType;

    @Enumerated(EnumType.STRING)
    @Column(length = 50) private ProgressStatus status = ProgressStatus.NOT_STARTED;

    @Column(name = "progress_percentage", precision = 5, scale = 2)
    private BigDecimal progressPercentage = BigDecimal.ZERO;

    @Column(name = "total_time_spent") private Integer totalTimeSpent = 0;
    @Column(precision = 5, scale = 2) private BigDecimal score;
    @Column(name = "max_score", precision = 5, scale = 2) private BigDecimal maxScore;
    @Column private Integer attempts = 1;
    @Column(name = "is_passed") private Boolean isPassed;
    @Column(columnDefinition = "TEXT") private String notes;
    @Column(name = "started_at") private LocalDateTime startedAt;
    @Column(name = "completed_at") private LocalDateTime completedAt;
    @Column(name = "last_accessed_at") private LocalDateTime lastAccessedAt;
    @Column(name = "total_items") private Integer totalItems = 0;
    @Column(name = "completed_items") private Integer completedItems = 0;
    @Column(name = "weighted_score", precision = 5, scale = 2) private BigDecimal weightedScore;
    @Column(name = "total_weight_percent", precision = 5, scale = 2) private BigDecimal totalWeightPercent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra_data", columnDefinition = "jsonb") private Map<String, Object> extraData;

    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (progressPercentage == null) progressPercentage = BigDecimal.ZERO;
        if (totalTimeSpent == null) totalTimeSpent = 0;
        if (attempts == null) attempts = 1;
        if (totalItems == null) totalItems = 0;
        if (completedItems == null) completedItems = 0;
        if (status == null) status = ProgressStatus.NOT_STARTED;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}