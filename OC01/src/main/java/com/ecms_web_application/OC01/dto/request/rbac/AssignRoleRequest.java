package com.ecms_web_application.OC01.dto.request.rbac;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Gán role cho account.
 */
@Setter
@Getter
public class AssignRoleRequest {

    @NotNull(message = "Role ID không được để trống")
    private Long roleId;
}