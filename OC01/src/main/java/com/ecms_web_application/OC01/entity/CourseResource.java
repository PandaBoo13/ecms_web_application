package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.QuizCategory;
import com.ecms_web_application.OC01.entity.enums.ResourceStatus;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
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
@Table(name = "resource",
    indexes = {
        @Index(name = "idx_resource_course",      columnList = "course_id"),
        @Index(name = "idx_resource_parent",      columnList = "parent_id"),
        @Index(name = "idx_resource_course_type", columnList = "course_id,resource_type")
    })
public class CourseResource {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false) private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id") private CourseResource parent;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_type", nullable = false, length = 20)
    private ResourceType resourceType;

    @Column(nullable = false, length = 255) private String title;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "order_index", nullable = false) private Integer orderIndex = 0;
    @Column(name = "is_required", nullable = false) private Boolean isRequired = false;
    @Column(name = "is_free_preview", nullable = false) private Boolean isFreePreview = false;
    @Column private Integer duration = 0;
    @Column(columnDefinition = "TEXT") private String content;
    @Column(name = "thumbnail_url", length = 500) private String thumbnailUrl;
    @Column(name = "file_name",  length = 255) private String fileName;
    @Column(name = "file_url",   length = 500) private String fileUrl;
    @Column(name = "file_size") private Long fileSize;
    @Column(name = "file_format", length = 50) private String fileFormat;
    @Column(name = "mime_type",   length = 100) private String mimeType;
    @Column(name = "max_attempts") private Integer maxAttempts;
    @Column(name = "passing_score", precision = 5, scale = 2) private BigDecimal passingScore;
    @Column(name = "time_limit") private Integer timeLimit;
    @Column(precision = 5, scale = 2) private BigDecimal points = BigDecimal.ZERO;
    @Column private LocalDateTime deadline;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb") private Map<String, Object> settings;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResourceStatus status = ResourceStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by") private Account createdBy;

    @Column(name = "available_from")  private LocalDateTime availableFrom;
    @Column(name = "available_until") private LocalDateTime availableUntil;

    @Enumerated(EnumType.STRING)
    @Column(name = "quiz_category", length = 20) private QuizCategory quizCategory;

    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (orderIndex == null) orderIndex = 0;
        if (isRequired == null) isRequired = false;
        if (isFreePreview == null) isFreePreview = false;
        if (duration == null) duration = 0;
        if (points == null) points = BigDecimal.ZERO;
        if (status == null) status = ResourceStatus.DRAFT;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}