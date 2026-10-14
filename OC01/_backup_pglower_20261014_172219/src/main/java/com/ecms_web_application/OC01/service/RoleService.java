package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.rbac.RoleRequest;
import com.ecms_web_application.OC01.dto.response.rbac.RoleResponse;

import java.util.List;

/**
 * Service CRUD role.
 */
public interface RoleService {

    List<RoleResponse> getAllRoles();

    RoleResponse getRoleById(Long roleId);

    RoleResponse createRole(RoleRequest request);

    RoleResponse updateRole(Long roleId, RoleRequest request);

    void deleteRole(Long roleId);
}