package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.config.security.PermissionSyncer;
import com.ecms_web_application.OC01.dto.request.rbac.*;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.rbac.*;
import com.ecms_web_application.OC01.service.AccountPermissionService;
import com.ecms_web_application.OC01.service.AccountRoleService;
import com.ecms_web_application.OC01.service.PermissionService;
import com.ecms_web_application.OC01.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;

/**
 * Controller cho module RBAC.
 *
 * Base path: /api/rbac
 *
 * Groups:
 * 1. Roles            — /roles/**
 * 2. Permissions      — /permissions/**
 * 3. Account perms    — /accounts/{accountId}/permissions/**
 * 4. Account role     — /accounts/{accountId}/role(s), /roles/{roleId}/accounts
 * 5. Accounts         — /accounts/**
 */

/**
 * ============================================================
 * RBAC CONTROLLER - QUẢN LÝ PHÂN QUYỀN (Role-Based Access Control)
 * ============================================================
 *
 * Base path: /api/rbac
 *
 * ═══════════════════════════════════════════════════════════
 * 1. QUẢN LÝ ROLE (5 endpoints)
 * ═══════════════════════════════════════════════════════════
 * 1.  [ADMIN] Lấy tất cả role
 * 2.  [ADMIN] Lấy chi tiết role theo ID
 * 3.  [ADMIN] Tạo role mới
 * 4.  [ADMIN] Cập nhật role theo ID
 * 5.  [ADMIN] Xóa role theo ID (chặn nếu còn account dùng)
 *
 * ═══════════════════════════════════════════════════════════
 * 2. QUẢN LÝ PERMISSION (8 endpoints)
 * ═══════════════════════════════════════════════════════════
 * 6.  [ADMIN] Lấy danh sách permission (phân trang + filter)
 * 7.  [ADMIN] Lấy TẤT CẢ permission (không phân trang)
 * 8.  [ADMIN] Lấy danh sách permission mặc định
 * 9.  [ADMIN] Lấy danh sách module distinct
 * 10. [ADMIN] Lấy chi tiết permission theo ID
 * 11. [ADMIN] Tạo permission mới
 * 12. [ADMIN] Cập nhật permission theo ID
 * 13. [ADMIN] Xóa permission theo ID
 *
 * ═══════════════════════════════════════════════════════════
 * 3. QUYỀN TRỰC TIẾP CỦA ACCOUNT (10 endpoints)
 * ═══════════════════════════════════════════════════════════
 * 14. [ADMIN] Lấy TẤT CẢ quyền của account (kèm default)
 * 15. [ADMIN] Lấy quyền RIÊNG của account (custom)
 * 16. [ADMIN] Gán 1 quyền cho account
 * 17. [ADMIN] Gán NHIỀU quyền cho account cùng lúc
 * 18. [ADMIN] Xóa cứng 1 quyền khỏi account
 * 19. [ADMIN] Vô hiệu hóa 1 quyền (soft delete)
 * 20. [ADMIN] Kích hoạt lại 1 quyền đã vô hiệu hóa
 * 21. [ADMIN] Xóa TẤT CẢ quyền của account
 * 22. [ADMIN] Kiểm tra account có permission cụ thể không
 * 23. [ADMIN] Kiểm tra account có permission theo resource/action
 *
 * ═══════════════════════════════════════════════════════════
 * 4. QUẢN LÝ ROLE CỦA ACCOUNT (4 endpoints)
 * ═══════════════════════════════════════════════════════════
 * 24. [ADMIN] Lấy role hiện tại của account
 * 25. [ADMIN] Gán role cho account
 * 26. [ADMIN] Xóa role khỏi account
 * 27. [ADMIN] Lấy danh sách account theo role ID
 *
 * ═══════════════════════════════════════════════════════════
 * 5. QUẢN LÝ ACCOUNT (3 endpoints)
 * ═══════════════════════════════════════════════════════════
 * 28. [ADMIN] Lấy danh sách account (phân trang + filter)
 * 29. [ADMIN] Lấy chi tiết account theo ID
 * 30. [ADMIN] Lấy danh sách account có role TEACHER
 *
 * ═══════════════════════════════════════════════════════════
 * GHI CHÚ
 * ═══════════════════════════════════════════════════════════
 * - Tất cả endpoint yêu cầu role ADMIN (xem APIURL.ADMIN_URLS)
 * - Sau mỗi thay đổi permission/role → clear cache phân quyền
 * - Xóa permission → cascade xóa account_permission liên quan
 * - Xóa role → chặn nếu còn account đang dùng (FK RESTRICT)
 *
 * ═══════════════════════════════════════════════════════════
 * TỔNG: 30 endpoints
 * ═══════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/rbac")
@RequiredArgsConstructor
@Slf4j
public class RBACController {

    private final RoleService roleService;
    private final PermissionService permissionService;
    private final AccountPermissionService accountPermissionService;
    private final AccountRoleService accountRoleService;
    private final PermissionSyncer permissionSyncer;

    // ============================================================
    // 1. ROLE MANAGEMENT
    // ============================================================

    /** GET /api/rbac/roles — Lấy tất cả role */
    @GetMapping("/roles")
    public ResponseEntity<RequestResponse> getAllRoles() {
        List<RoleResponse> data = roleService.getAllRoles();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách role thành công"));
    }

    /** GET /api/rbac/roles/{id} — Chi tiết role */
    @GetMapping("/roles/{id}")
    public ResponseEntity<RequestResponse> getRoleById(@PathVariable Long id) {
        RoleResponse data = roleService.getRoleById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy role thành công"));
    }

    /** POST /api/rbac/roles — Tạo role */
    @PostMapping("/roles")
    public ResponseEntity<RequestResponse> createRole(@Valid @RequestBody RoleRequest request) {
        RoleResponse data = roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo role thành công"));
    }

    /** PUT /api/rbac/roles/{id} — Cập nhật role */
    @PutMapping("/roles/{id}")
    public ResponseEntity<RequestResponse> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleRequest request) {
        RoleResponse data = roleService.updateRole(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật role thành công"));
    }

    /** DELETE /api/rbac/roles/{id} — Xóa role */
    @DeleteMapping("/roles/{id}")
    public ResponseEntity<RequestResponse> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(new RequestResponse("Xóa role thành công"));
    }


    // ============================================================
    // 2. PERMISSION MANAGEMENT
    // ============================================================

    /**
     * GET /api/rbac/permissions
     * Query: ?module=&search=&page=0&size=20&sort=module,asc
     */
    @GetMapping("/permissions")
    public ResponseEntity<RequestResponse> searchPermissions(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "module") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<PermissionResponse> data = permissionService.searchPermissions(module, search, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách permission thành công"));
    }

    /** GET /api/rbac/permissions/all — Không phân trang (dropdown FE) */
    @GetMapping("/permissions/all")
    public ResponseEntity<RequestResponse> getAllPermissions() {
        List<PermissionResponse> data = permissionService.getAllPermissions();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tất cả permission thành công"));
    }

    /** GET /api/rbac/permissions/default — Permission mặc định */
    @GetMapping("/permissions/default")
    public ResponseEntity<RequestResponse> getDefaultPermissions() {
        List<PermissionResponse> data = permissionService.getDefaultPermissions();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy permission mặc định thành công"));
    }

    /** GET /api/rbac/permissions/modules — Danh sách module distinct */
    @GetMapping("/permissions/modules")
    public ResponseEntity<RequestResponse> getDistinctModules() {
        List<String> data = permissionService.getDistinctModules();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách module thành công"));
    }

    /** GET /api/rbac/permissions/{id} — Chi tiết permission */
    @GetMapping("/permissions/{id}")
    public ResponseEntity<RequestResponse> getPermissionById(@PathVariable Long id) {
        PermissionResponse data = permissionService.getPermissionById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy permission thành công"));
    }

    /** POST /api/rbac/permissions — Tạo permission */
    @PostMapping("/permissions")
    public ResponseEntity<RequestResponse> createPermission(
            @Valid @RequestBody PermissionRequest request) {
        PermissionResponse data = permissionService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo permission thành công"));
    }

    /** PUT /api/rbac/permissions/{id} — Cập nhật permission */
    @PutMapping("/permissions/{id}")
    public ResponseEntity<RequestResponse> updatePermission(
            @PathVariable Long id,
            @Valid @RequestBody PermissionRequest request) {
        PermissionResponse data = permissionService.updatePermission(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật permission thành công"));
    }

    /** DELETE /api/rbac/permissions/{id} — Xóa permission */
    @DeleteMapping("/permissions/{id}")
    public ResponseEntity<RequestResponse> deletePermission(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok(new RequestResponse("Xóa permission thành công"));
    }


    // ============================================================
    // 3. ACCOUNT PERMISSION MANAGEMENT
    // ============================================================

    /** GET /api/rbac/accounts/{accountId}/permissions */
    @GetMapping("/accounts/{accountId}/permissions")
    public ResponseEntity<RequestResponse> getAllAccountPermissions(@PathVariable Long accountId) {
        List<AccountPermissionResponse> data = accountPermissionService.getAllAccountPermissions(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tất cả quyền của account thành công"));
    }

    /** GET /api/rbac/accounts/{accountId}/permissions/custom */
    @GetMapping("/accounts/{accountId}/permissions/custom")
    public ResponseEntity<RequestResponse> getCustomAccountPermissions(@PathVariable Long accountId) {
        List<AccountPermissionResponse> data = accountPermissionService.getCustomAccountPermissions(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy quyền riêng của account thành công"));
    }

    /** POST /api/rbac/accounts/{accountId}/permissions — Gán 1 quyền */
    @PostMapping("/accounts/{accountId}/permissions")
    public ResponseEntity<RequestResponse> assignPermission(
            @PathVariable Long accountId,
            @Valid @RequestBody AssignPermissionRequest request) {
        accountPermissionService.assignPermission(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse("Gán quyền thành công"));
    }

    /** POST /api/rbac/accounts/{accountId}/permissions/batch — Gán nhiều quyền */
    @PostMapping("/accounts/{accountId}/permissions/batch")
    public ResponseEntity<RequestResponse> assignPermissionsBatch(
            @PathVariable Long accountId,
            @Valid @RequestBody AssignPermissionsBatchRequest request) {
        accountPermissionService.assignPermissionsBatch(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse("Gán batch quyền thành công"));
    }

    /** DELETE /api/rbac/accounts/{accountId}/permissions/{permissionId} — Xóa cứng */
    @DeleteMapping("/accounts/{accountId}/permissions/{permissionId}")
    public ResponseEntity<RequestResponse> removePermission(
            @PathVariable Long accountId,
            @PathVariable Long permissionId) {
        accountPermissionService.removePermission(accountId, permissionId);
        return ResponseEntity.ok(new RequestResponse("Xóa quyền thành công"));
    }

    /** PATCH /api/rbac/accounts/{accountId}/permissions/{permissionId}/deactivate */
    @PatchMapping("/accounts/{accountId}/permissions/{permissionId}/deactivate")
    public ResponseEntity<RequestResponse> deactivatePermission(
            @PathVariable Long accountId,
            @PathVariable Long permissionId) {
        accountPermissionService.deactivatePermission(accountId, permissionId);
        return ResponseEntity.ok(new RequestResponse("Vô hiệu hóa quyền thành công"));
    }

    /** PATCH /api/rbac/accounts/{accountId}/permissions/{permissionId}/activate */
    @PatchMapping("/accounts/{accountId}/permissions/{permissionId}/activate")
    public ResponseEntity<RequestResponse> activatePermission(
            @PathVariable Long accountId,
            @PathVariable Long permissionId) {
        accountPermissionService.activatePermission(accountId, permissionId);
        return ResponseEntity.ok(new RequestResponse("Kích hoạt quyền thành công"));
    }

    /** DELETE /api/rbac/accounts/{accountId}/permissions — Xóa tất cả */
    @DeleteMapping("/accounts/{accountId}/permissions")
    public ResponseEntity<RequestResponse> removeAllPermissions(@PathVariable Long accountId) {
        accountPermissionService.removeAllPermissions(accountId);
        return ResponseEntity.ok(new RequestResponse("Xóa tất cả quyền của account thành công"));
    }

    /** GET /api/rbac/accounts/{accountId}/permissions/check?permissionName=GET:/api/stations */
    @GetMapping("/accounts/{accountId}/permissions/check")
    public ResponseEntity<RequestResponse> checkPermission(
            @PathVariable Long accountId,
            @RequestParam String permissionName) {
        PermissionCheckResponse data = accountPermissionService.checkPermission(accountId, permissionName);
        return ResponseEntity.ok(new RequestResponse(data, "Kiểm tra quyền thành công"));
    }

    /** GET /api/rbac/accounts/{accountId}/permissions/check-resource?resource=station&action=GET */
    @GetMapping("/accounts/{accountId}/permissions/check-resource")
    public ResponseEntity<RequestResponse> checkPermissionByResource(
            @PathVariable Long accountId,
            @RequestParam String resource,
            @RequestParam String action) {
        PermissionCheckResponse data = accountPermissionService
                .checkPermissionByResource(accountId, resource, action);
        return ResponseEntity.ok(new RequestResponse(data, "Kiểm tra quyền thành công"));
    }


    // ============================================================
    // 4. ACCOUNT ROLE MANAGEMENT
    // ============================================================

    /** GET /api/rbac/accounts/{accountId}/roles */
    @GetMapping("/accounts/{accountId}/roles")
    public ResponseEntity<RequestResponse> getAccountRoles(@PathVariable Long accountId) {
        List<AccountRoleResponse> data = accountRoleService.getAccountRoles(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy role của account thành công"));
    }

    /** PUT /api/rbac/accounts/{accountId}/role — Gán role */
    @PutMapping("/accounts/{accountId}/role")
    public ResponseEntity<RequestResponse> assignRoleToAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody AssignRoleRequest request) {
        accountRoleService.assignRoleToAccount(accountId, request);
        return ResponseEntity.ok(new RequestResponse("Gán role thành công"));
    }

    /** DELETE /api/rbac/accounts/{accountId}/role — Xóa role */
    @DeleteMapping("/accounts/{accountId}/role")
    public ResponseEntity<RequestResponse> removeRoleFromAccount(@PathVariable Long accountId) {
        accountRoleService.removeRoleFromAccount(accountId);
        return ResponseEntity.ok(new RequestResponse("Xóa role khỏi account thành công"));
    }

    /** GET /api/rbac/roles/{roleId}/accounts — Account theo role */
    @GetMapping("/roles/{roleId}/accounts")
    public ResponseEntity<RequestResponse> getAccountsByRole(
            @PathVariable Long roleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AccountResponse> data = accountRoleService.getAccountsByRole(roleId, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách account theo role thành công"));
    }


    // ============================================================
    // 5. ACCOUNT MANAGEMENT
    // ============================================================

    /**
     * GET /api/rbac/accounts
     * Query: ?roleCode=&isActive=&search=&page=&size=&sortBy=&sortDir=
     */
    @GetMapping("/accounts")
    public ResponseEntity<RequestResponse> searchAccounts(
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<AccountResponse> data = accountRoleService.searchAccounts(
                roleCode, isActive, search, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách account thành công"));
    }

    /** GET /api/rbac/accounts/{accountId} — Chi tiết 1 account */
    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<RequestResponse> getAccountById(@PathVariable Long accountId) {
        AccountResponse data = accountRoleService.getAccountById(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy account thành công"));
    }

    /** GET /api/rbac/accounts/teachers — Danh sách teacher */
    @GetMapping("/accounts/teachers")
    public ResponseEntity<RequestResponse> getTeacherAccounts() {
        List<AccountResponse> data = accountRoleService.getTeacherAccounts();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách teacher thành công"));
    }

    /**
     * POST /api/rbac/permissions/sync — Sync thủ công từ file cấu hình
     */
    @PostMapping("/permissions/sync")
    public ResponseEntity<RequestResponse> syncPermissions() {
        String result = permissionSyncer.sync();
        return ResponseEntity.ok(new RequestResponse(result, "Sync permission hoàn tất"));
    }
}