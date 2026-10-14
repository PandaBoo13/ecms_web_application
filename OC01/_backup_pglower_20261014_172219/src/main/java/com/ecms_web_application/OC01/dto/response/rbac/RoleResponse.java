package com.ecms_web_application.OC01.dto.response.rbac;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Thông tin role.
 */
@Setter
@Getter
public class RoleResponse {

    private Long id;
    private String code;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}