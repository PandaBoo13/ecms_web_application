package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.response.rbac.AccountPermissionResponse;
import java.util.List;

public interface RolePermissionService {
    List<AccountPermissionResponse> listByRole(Long roleId);
    void assign(Long roleId, Long permissionId);
    void assignBatch(Long roleId, List<Long> permissionIds);
    void remove(Long roleId, Long permissionId);
    void removeAll(Long roleId);
    void activate(Long roleId, Long permissionId);
    void deactivate(Long roleId, Long permissionId);
}