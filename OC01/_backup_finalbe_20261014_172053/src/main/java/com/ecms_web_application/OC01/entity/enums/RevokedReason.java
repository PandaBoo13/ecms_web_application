package com.ecms_web_application.OC01.entity.enums;

/**
 * Lý do revoke session.
 */
public enum RevokedReason {
    LOGOUT,           // User đăng xuất
    PASSWORD_CHANGE,  // Đổi mật khẩu → revoke tất cả session cũ
    ADMIN_REVOKE,     // Admin kick user ra
    EXPIRED,          // Hết hạn tự nhiên (dọn dẹp)
    ROTATED           // Refresh token rotation — token cũ bị thay bằng token mới
}