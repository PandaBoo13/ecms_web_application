package com.ecms_web_application.OC01.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "account_permission")
@IdClass(AccountPermissionId.class)
public class AccountPermission {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled = true;

    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ===== Hooks =====
    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.assignedAt == null) this.assignedAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.isEnabled == null) this.isEnabled = true;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}