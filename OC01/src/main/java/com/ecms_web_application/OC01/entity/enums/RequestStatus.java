package com.ecms_web_application.OC01.entity.enums;

/**
 * Trạng thái của request.
 *
 *  PENDING   — chờ duyệt
 *  APPROVED  — đã duyệt
 *  REJECTED  — từ chối (bắt buộc có reject_reason)
 *  CANCELLED — người tạo tự hủy
 */
public enum RequestStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED;

    public static RequestStatus fromCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("RequestStatus không được rỗng");
        }
        try {
            return RequestStatus.valueOf(code.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("RequestStatus không hợp lệ: " + code);
        }
    }
}