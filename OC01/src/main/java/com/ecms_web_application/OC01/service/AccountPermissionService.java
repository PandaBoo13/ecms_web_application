package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.rbac.AssignPermissionRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AssignPermissionsBatchRequest;
import com.ecms_web_application.OC01.dto.response.rbac.AccountPermissionResponse;
import com.ecms_web_application.OC01.dto.response.rbac.PermissionCheckResponse;

import java.util.List;

/**
 * Service gán / thu hồi / kiểm tra permission của account.
 */
public interface AccountPermissionService {

    // ============ QUERY ============
    List<AccountPermissionResponse> getAllAccountPermissions(Long accountId);

    List<AccountPermissionResponse> getCustomAccountPermissions(Long accountId);

    // ============ ASSIGN ============
    void assignPermission(Long accountId, AssignPermissionRequest request);

    void assignPermissionsBatch(Long accountId, AssignPermissionsBatchRequest request);

    // ============ REMOVE / ACTIVATE / DEACTIVATE ============
    void removePermission(Long accountId, Long permissionId);

    void deactivatePermission(Long accountId, Long permissionId);

    void activatePermission(Long accountId, Long permissionId);

    void removeAllPermissions(Long accountId);

    // ============ CHECK ============
    PermissionCheckResponse checkPermission(Long accountId, String permissionName);

    PermissionCheckResponse checkPermissionByResource(Long accountId, String resource, String action);

    boolean hasPermission(Long accountId, String method, String endpoint);
}