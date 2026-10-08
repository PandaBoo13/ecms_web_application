package com.ecms_web_application.OC01.dto.response.rbac;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Thông tin account cho admin UI.
 * Không expose password hash.
 */
@Setter
@Getter
public class AccountResponse {

    private Long accountId;
    private String email;

    // Role
    private Long roleId;
    private String roleCode;

    // Profile
    private String fullName;
    private String phone;
    private String avatarUrl;

    // Trạng thái
    private Boolean isActive;
    private Boolean isLocked;
    private LocalDateTime emailVerifiedAt;
    private LocalDateTime lastLoginAt;
    private LocalDateTime lockedUntil;

    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}