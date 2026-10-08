package com.ecms_web_application.OC01.dto.request.rbac;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Gán 1 permission cho account.
 */
@Setter
@Getter
public class AssignPermissionRequest {

    @NotNull(message = "Permission ID không được để trống")
    private Long permissionId;
}