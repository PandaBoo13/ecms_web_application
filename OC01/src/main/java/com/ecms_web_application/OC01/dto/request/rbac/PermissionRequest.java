package com.ecms_web_application.OC01.dto.request.rbac;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Tạo / cập nhật permission.
 */
@Setter
@Getter
public class PermissionRequest {

    @NotBlank(message = "Method là bắt buộc")
    @Size(max = 10, message = "Method tối đa 10 ký tự")
    private String method;   // GET, POST, PUT, DELETE, PATCH

    @NotBlank(message = "Endpoint pattern là bắt buộc")
    @Size(max = 255, message = "Endpoint pattern tối đa 255 ký tự")
    private String endpointPattern;   // /api/categories/{id}

    @Size(max = 100, message = "Module tối đa 100 ký tự")
    private String module;   // category, instructor, rbac

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    private String description;
}