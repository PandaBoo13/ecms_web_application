package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.QuestionStatus;
import com.ecms_web_application.OC01.entity.enums.QuestionType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Setter @Getter
@Entity
@Table(name = "question",
    indexes = {
        @Index(name = "idx_question_course", columnList = "course_id"),
        @Index(name = "idx_question_lesson", columnList = "lesson_id")
    })
public class Question {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false) private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id") private CourseResource lesson;

    @Column(length = 255) private String hashtag;
    @Column(columnDefinition = "TEXT", nullable = false) private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb") private List<String> options;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "correct_answer", columnDefinition = "jsonb") private List<String> correctAnswer;

    @Column(columnDefinition = "TEXT") private String explanation;
    @Column(nullable = false, precision = 5, scale = 2) private BigDecimal points = BigDecimal.ONE;
    @Column(name = "order_index", nullable = false) private Integer orderIndex = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionStatus status = QuestionStatus.ACTIVE;

    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (points == null) points = BigDecimal.ONE;
        if (orderIndex == null) orderIndex = 0;
        if (status == null) status = QuestionStatus.ACTIVE;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}