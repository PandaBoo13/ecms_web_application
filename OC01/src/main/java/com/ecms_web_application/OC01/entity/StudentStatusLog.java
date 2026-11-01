package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entity đại diện cho nhật ký thay đổi trạng thái học viên (StudentStatusLogs).
 * Bảng: student_status_logs
 */
@Getter
@Setter
@Entity
@Table(name = "student_status_logs")
public class StudentStatusLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "old_status", length = 30)
    private String oldStatus;

    @Column(name = "new_status", nullable = false, length = 30)
    private String newStatus;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "enrollment_id")
    private Long enrollmentId;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_by_type", nullable = false, length = 20)
    private String updatedByType = "SYSTEM";

    @Column(name = "updated_at", nullable = false, updatable = false)
    private LocalDateTime updatedAt;

    // Helper getters/setters for backward compatibility
    public Long getChangedBy() {
        return this.updatedBy;
    }

    public void setChangedBy(Long changedBy) {
        this.updatedBy = changedBy;
    }

    public LocalDateTime getChangedAt() {
        return this.updatedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.updatedAt = changedAt;
    }

    @PrePersist
    void onCreate() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
        if (this.updatedByType == null || this.updatedByType.isBlank()) {
            this.updatedByType = (this.updatedBy != null) ? "USER" : "SYSTEM";
        }
    }
}
