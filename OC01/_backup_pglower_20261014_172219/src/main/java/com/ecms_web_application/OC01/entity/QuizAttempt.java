package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.QuizAttemptStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Setter @Getter
@Entity
@Table(name = "quiz_attempt",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_attempt_number",
        columnNames = {"account_id", "resource_id", "attempt_number"}))
public class QuizAttempt {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false) private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false) private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resource_id", nullable = false) private CourseResource resource;

    @Column(name = "attempt_number", nullable = false) private Integer attemptNumber = 1;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "question_ids", columnDefinition = "jsonb") private List<Long> questionIds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb") private Map<String, Object> answers;

    @Column(precision = 5, scale = 2) private BigDecimal score;
    @Column(name = "max_score",     precision = 5, scale = 2) private BigDecimal maxScore;
    @Column(name = "passing_score", precision = 5, scale = 2) private BigDecimal passingScore;
    @Column(name = "is_passed") private Boolean isPassed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuizAttemptStatus status = QuizAttemptStatus.IN_PROGRESS;

    @Column(name = "started_at", nullable = false) private LocalDateTime startedAt;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
    @Column(name = "time_spent")   private Integer timeSpent;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (startedAt == null) startedAt = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = QuizAttemptStatus.IN_PROGRESS;
        if (attemptNumber == null) attemptNumber = 1;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}