package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

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

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "NEW";

    @Column(name = "converted_at")
    private LocalDateTime convertedAt;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "assigned_consultant_id")
    private Long assignedConsultantId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ===== Hooks =====
    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.status == null || this.status.isBlank()) this.status = "NEW";
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
