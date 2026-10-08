package com.ecms_web_application.OC01.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.ecms_web_application.OC01.dto.request.rbac.PermissionRequest;
import com.ecms_web_application.OC01.dto.response.rbac.PermissionResponse;

import java.util.List;

/**
 * Service CRUD permission (không gắn với account cụ thể).
 */
public interface PermissionService {

    // ============ QUERY ============
    Page<PermissionResponse> searchPermissions(String module, String search, Pageable pageable);

    List<PermissionResponse> getAllPermissions();

    List<PermissionResponse> getDefaultPermissions();

    PermissionResponse getPermissionById(Long permissionId);

    List<String> getDistinctModules();

    // ============ MUTATION ============
    PermissionResponse createPermission(PermissionRequest request);

    PermissionResponse updatePermission(Long permissionId, PermissionRequest request);

    void deletePermission(Long permissionId);

    // ============ UTILS ============
    boolean existsByMethodAndEndpoint(String method, String endpoint);
}