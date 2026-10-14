package com.ecms_web_application.OC01.dto.response.rbac;

import lombok.Getter;
import lombok.Setter;

/**
 * Kết quả check permission.
 * Có thể check theo endpoint hoặc theo resource+action.
 */
@Setter
@Getter
public class PermissionCheckResponse {

    private Long accountId;

    // Check theo endpoint — "METHOD:/path"
    private String permissionName;

    // Check theo resource + action
    private String resource;
    private String action;

    private Boolean hasPermission;
    private String message;
}