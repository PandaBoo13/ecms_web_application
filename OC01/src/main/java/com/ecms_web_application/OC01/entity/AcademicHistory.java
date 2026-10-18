package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity đại diện cho các lượt học của học viên (AcademicHistories).
 * Bảng: academic_histories
 */
@Getter
@Setter
@Entity
@Table(name = "academic_histories")
public class AcademicHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "lead_id")
    private Long leadId;

    @Column(name = "enrollment_id")
    private Long enrollmentId;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "class_id")
    private Long classId;

    @Column(name = "final_grade", precision = 5, scale = 2)
    private BigDecimal finalGrade;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

