package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.ClassStatus;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.ProgressType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Setter @Getter
@Entity
@Table(name = "course",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_course_code",         columnNames = "code"),
        @UniqueConstraint(name = "uk_course_slug",         columnNames = "slug"),
        @UniqueConstraint(name = "uk_course_display_code", columnNames = "display_code")
    })
public class Course {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50) private String code;
    @Column(name = "display_code", length = 50) private String displayCode;
    @Column(nullable = false, length = 255) private String title;
    @Column(nullable = false, length = 255) private String slug;
    @Column(name = "short_description", length = 500) private String shortDescription;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "thumbnail_url", length = 500) private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "course_type", length = 10, nullable = false)
    private CourseType courseType = CourseType.ONLINE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id") private Category category;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb") private List<String> outcomes;

    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal price = BigDecimal.ZERO;
    @Column(name = "old_price", precision = 10, scale = 2) private BigDecimal oldPrice;
    @Column(name = "is_free", nullable = false) private Boolean isFree = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "progress_type", length = 30, nullable = false)
    private ProgressType progressType = ProgressType.COMPLETION_BASED;

    @Column(name = "min_students") private Integer minStudents;
    @Column(name = "max_students") private Integer maxStudents;
    @Column(name = "current_students", nullable = false) private Integer currentStudents = 0;
    @Column(name = "start_date") private LocalDate startDate;
    @Column(name = "end_date")   private LocalDate endDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id") private Account teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id") private Room room;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schedule_days", columnDefinition = "jsonb")
    private List<Integer> scheduleDays;

    @Column(name = "session_start_time") private LocalTime sessionStartTime;
    @Column(name = "session_end_time")   private LocalTime sessionEndTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "class_status", length = 20) private ClassStatus classStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CourseStatus status = CourseStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false) private Account createdBy;

    @Column(name = "copied_from_course_id") private Long copiedFromCourseId;
    @Column(name = "deleted_at") private LocalDateTime deletedAt;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;

    @Column(name = "learning_mode", length = 20) private String learningMode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allowed_room_ids", columnDefinition = "jsonb") private List<Long> allowedRoomIds;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (price == null) price = BigDecimal.ZERO;
        if (isFree == null) isFree = false;
        if (currentStudents == null) currentStudents = 0;
        if (courseType == null) courseType = CourseType.ONLINE;
        if (progressType == null) progressType = ProgressType.COMPLETION_BASED;
        if (status == null) status = CourseStatus.DRAFT;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}