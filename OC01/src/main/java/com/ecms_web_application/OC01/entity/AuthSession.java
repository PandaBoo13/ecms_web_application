package com.ecms_web_application.OC01.entity;

import com.ecms_web_application.OC01.entity.enums.DeviceType;
import com.ecms_web_application.OC01.entity.enums.RevokedReason;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * AuthSession — Quản lý refresh token theo từng thiết bị.
 *
 * Mỗi lần user login → tạo 1 bản ghi.
 * Refresh token chỉ lưu hash (SHA-256), không lưu raw token.
 * Khi logout / đổi password → set revokedAt + revokedReason.
 */
@Setter
@Getter
@Entity
@Table(name = "auth_session")
public class AuthSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    // ===== Account (ManyToOne) =====
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    // ===== Token =====
    @Column(name = "refresh_token_hash", nullable = false, unique = true, length = 255)
    private String refreshTokenHash;

    // ===== Thiết bị =====
    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false, length = 20)
    private DeviceType deviceType = DeviceType.OTHER;

    @Column(name = "device_info", length = 500)
    private String deviceInfo;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    // ===== Vòng đời =====
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "revoked_reason", length = 30)
    private RevokedReason revokedReason;

    @Column(name = "last_active_at")
    private LocalDateTime lastActiveAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // ===== Audit =====
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ============================================================
    // HOOKS
    // ============================================================

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        if (this.updatedAt == null) this.updatedAt = now;
        if (this.deviceType == null) this.deviceType = DeviceType.OTHER;
        if (this.lastActiveAt == null) this.lastActiveAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ============================================================
    // HELPER
    // ============================================================

    public boolean isRevoked() {
        return this.revokedAt != null;
    }

    public boolean isExpired() {
        return this.expiresAt != null && this.expiresAt.isBefore(LocalDateTime.now());
    }

    public boolean isActive() {
        return !isRevoked() && !isExpired();
    }

    public void revoke(RevokedReason reason) {
        this.revokedAt = LocalDateTime.now();
        this.revokedReason = reason;
    }

    public void touch() {
        this.lastActiveAt = LocalDateTime.now();
    }
}