package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Bảng trung gian many-to-many giữa Account (giảng viên) và Category (chuyên môn).
 *
 * Mỗi giảng viên có thể có nhiều chuyên môn, nhưng chỉ TỐI ĐA 1 chuyên môn chính
 * (đảm bảo bằng partial unique index ở DB).
 */
@Setter
@Getter
@Entity
@Table(name = "instructor_specialization")
@IdClass(InstructorSpecializationId.class)
public class InstructorSpecialization {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary = false;

    @Column(name = "years_of_exp")
    private Short yearsOfExp;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ===== Hooks =====
    @PrePersist
    void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
        if (this.isPrimary == null) this.isPrimary = false;
    }
}