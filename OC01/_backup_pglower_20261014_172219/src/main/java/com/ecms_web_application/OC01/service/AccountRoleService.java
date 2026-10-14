package com.ecms_web_application.OC01.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.ecms_web_application.OC01.dto.request.rbac.AssignRoleRequest;
import com.ecms_web_application.OC01.dto.response.rbac.AccountResponse;
import com.ecms_web_application.OC01.dto.response.rbac.AccountRoleResponse;

import java.util.List;

/**
 * Service quản lý role của account + quản lý account cho admin.
 */
public interface AccountRoleService {

    // ============ ROLE OF ACCOUNT ============
    List<AccountRoleResponse> getAccountRoles(Long accountId);

    void assignRoleToAccount(Long accountId, AssignRoleRequest request);

    void removeRoleFromAccount(Long accountId);

    // ============ ACCOUNT MANAGEMENT ============
    Page<AccountResponse> getAccountsByRole(Long roleId, Pageable pageable);

    Page<AccountResponse> searchAccounts(String roleCode, Boolean isActive, String search, Pageable pageable);

    AccountResponse getAccountById(Long accountId);

    List<AccountResponse> getTeacherAccounts();
}