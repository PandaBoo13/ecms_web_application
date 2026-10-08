package com.ecms_web_application.OC01.dto.response.rbac;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Thông tin 1 permission (không gắn với account cụ thể).
 */
@Setter
@Getter
public class PermissionResponse {

    private Long id;
    private String method;
    private String endpointPattern;
    private String module;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}