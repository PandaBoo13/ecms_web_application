package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity đại diện cho kết quả đánh giá đầu vào của Lead (LeadPlacementTests).
 * Bảng: lead_placement_tests
 */
@Getter
@Setter
@Entity
@Table(name = "lead_placement_tests")
public class LeadPlacementTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "lead_id", nullable = false)
    private Long leadId;

    @Column(name = "test_status", nullable = false, length = 50)
    private String testStatus = "SCHEDULED";

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "test_score", precision = 5, scale = 2)
    private BigDecimal testScore;

    @Column(name = "recommended_level", length = 100)
    private String recommendedLevel;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.testStatus == null || this.testStatus.isBlank()) {
            this.testStatus = "SCHEDULED";
        }
    }
}

