package com.ecms_web_application.OC01.dto.response.rbac;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Chi tiết 1 permission được gán cho account.
 */
@Setter
@Getter
public class AccountPermissionResponse {

    private Long permissionId;
    private String method;
    private String endpointPattern;
    private String module;
    private String description;

    private Boolean isEnabled;
    private LocalDateTime assignedAt;
    private LocalDateTime updatedAt;
}