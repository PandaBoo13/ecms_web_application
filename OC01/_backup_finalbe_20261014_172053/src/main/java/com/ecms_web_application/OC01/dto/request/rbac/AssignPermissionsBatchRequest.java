package com.ecms_web_application.OC01.dto.request.rbac;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Gán nhiều permission cùng lúc cho 1 account.
 */
@Setter
@Getter
public class AssignPermissionsBatchRequest {

    @NotEmpty(message = "Danh sách permission ID không được để trống")
    private List<Long> permissionIds;
}