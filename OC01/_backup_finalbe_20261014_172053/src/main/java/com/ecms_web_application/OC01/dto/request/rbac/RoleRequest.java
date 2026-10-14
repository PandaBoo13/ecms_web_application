package com.ecms_web_application.OC01.dto.request.rbac;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Tạo / cập nhật role.
 */
@Setter
@Getter
public class RoleRequest {

    @NotBlank(message = "Mã role là bắt buộc")
    @Size(max = 50, message = "Mã role tối đa 50 ký tự")
    private String code;   // ADMIN, INSTRUCTOR, STUDENT

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    private String description;
}