package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entity đại diện cho nhật ký phân công / chuyển người phụ trách Lead (LeadAssignmentLogs).
 * Bảng: lead_assignment_logs
 */
@Getter
@Setter
@Entity
@Table(name = "lead_assignment_logs")
public class LeadAssignmentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "lead_id", nullable = false)
    private Long leadId;

    @Column(name = "old_consultant_id")
    private Long oldConsultantId;

    @Column(name = "new_consultant_id")
    private Long newConsultantId;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    @PrePersist
    void onCreate() {
        if (this.changedAt == null) {
            this.changedAt = LocalDateTime.now();
        }
    }
}

