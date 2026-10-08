package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Category — dùng chung cho:
 * - Danh mục khóa học
 * - Chuyên môn giảng viên
 *
 * Hỗ trợ cây phân cấp qua parent_id (self-reference).
 * Chuyên môn giảng viên thường gán ở cấp cao (parent_id = NULL) và áp dụng
 * cho mọi cấp con bên dưới nhờ Recursive CTE khi query.
 */
@Setter
@Getter
@Entity
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 255)
    private String slug;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // ===== Cây phân cấp (self-reference) =====
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    private List<Category> children = new ArrayList<>();

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // ===== Audit =====
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ===== Relations =====
    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    private List<InstructorSpecialization> instructorSpecializations = new ArrayList<>();

    // ===== Hooks =====
    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.isActive == null) this.isActive = true;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ===== Helper =====
    public boolean isRoot() {
        return this.parent == null;
    }
}