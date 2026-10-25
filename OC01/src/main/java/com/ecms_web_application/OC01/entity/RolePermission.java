package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "role_permission")
@IdClass(RolePermissionId.class)
public class RolePermission {
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled = true;

    @Column(name = "assigned_at", updatable = false, nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (assignedAt == null) assignedAt = now;
        if (updatedAt == null) updatedAt = now;
        if (isEnabled == null) isEnabled = true;
    }

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }
}