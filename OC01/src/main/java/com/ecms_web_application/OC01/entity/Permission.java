package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
@Entity
@Table(name = "permission")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "method", nullable = false, length = 10)
    private String method;

    @Column(name = "endpoint_pattern", nullable = false, length = 255)
    private String endpointPattern;

    @Column(name = "module", length = 100)
    private String module;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ===== Relations =====
    @OneToMany(mappedBy = "permission", fetch = FetchType.LAZY)
    private List<AccountPermission> accountPermissions = new ArrayList<>();

    // ===== Hooks =====
    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}