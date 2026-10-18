package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Entity đại diện cho nhật ký tương tác với Lead (LeadInteractions).
 * Bảng: lead_interactions
 */
@Getter
@Setter
@Entity
@Table(name = "lead_interactions")
public class LeadInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "lead_id", nullable = false)
    private Long leadId;

    @Column(name = "interaction_type", nullable = false, length = 50)
    private String interactionType;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "result", length = 50)
    private String result;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "performed_by")
    private Long performedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

