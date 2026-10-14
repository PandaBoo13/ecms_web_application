package com.ecms_web_application.OC01.dto.request.auth;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Request cập nhật profile — tất cả field đều optional.
 *
 * Quy ước:
 *   - null       → giữ nguyên (không đụng)
 *   - ""         → clear về null
 *   - "  abc  "  → trim rồi set "abc"
 */
@Setter
@Getter
public class UpdateProfileRequest {

    @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
    private String fullName;

    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
    private String phone;

    @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
    private String address;

    @Size(max = 500, message = "URL ảnh đại diện không được vượt quá 500 ký tự")
    private String avatarUrl;
}