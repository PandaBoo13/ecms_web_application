package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.config.security.PermissionSyncer;
import com.ecms_web_application.OC01.dto.request.AccountLockRequest;
import com.ecms_web_application.OC01.dto.request.rbac.*;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.rbac.*;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rbac")
@RequiredArgsConstructor
@Slf4j
public class RBACController {

    private final RoleService roleService;
    private final PermissionService permissionService;
    private final AccountRoleService accountRoleService;
    private final PermissionSyncer permissionSyncer;

    // ============================================================
    // 1. ROLE MANAGEMENT
    // ============================================================

    @GetMapping("/roles")
    public ResponseEntity<RequestResponse> getAllRoles() {
        List<RoleResponse> data = roleService.getAllRoles();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách role thành công"));
    }

    @GetMapping("/roles/{id}")
    public ResponseEntity<RequestResponse> getRoleById(@PathVariable Long id) {
        RoleResponse data = roleService.getRoleById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy role thành công"));
    }

    @PostMapping("/roles")
    public ResponseEntity<RequestResponse> createRole(@Valid @RequestBody RoleRequest request) {
        RoleResponse data = roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo role thành công"));
    }

    @PutMapping("/roles/{id}")
    public ResponseEntity<RequestResponse> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleRequest request) {
        RoleResponse data = roleService.updateRole(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật role thành công"));
    }

    @DeleteMapping("/roles/{id}")
    public ResponseEntity<RequestResponse> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(new RequestResponse("Xóa role thành công"));
    }

    // ============================================================
    // 2. PERMISSION MANAGEMENT
    // ============================================================

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

    @GetMapping("/permissions/all")
    public ResponseEntity<RequestResponse> getAllPermissions() {
        List<PermissionResponse> data = permissionService.getAllPermissions();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tất cả permission thành công"));
    }

    @GetMapping("/permissions/modules")
    public ResponseEntity<RequestResponse> getDistinctModules() {
        List<String> data = permissionService.getDistinctModules();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách module thành công"));
    }

    @GetMapping("/permissions/{id}")
    public ResponseEntity<RequestResponse> getPermissionById(@PathVariable Long id) {
        PermissionResponse data = permissionService.getPermissionById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy permission thành công"));
    }

    @PostMapping("/permissions")
    public ResponseEntity<RequestResponse> createPermission(
            @Valid @RequestBody PermissionRequest request) {
        PermissionResponse data = permissionService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo permission thành công"));
    }

    @PutMapping("/permissions/{id}")
    public ResponseEntity<RequestResponse> updatePermission(
            @PathVariable Long id,
            @Valid @RequestBody PermissionRequest request) {
        PermissionResponse data = permissionService.updatePermission(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật permission thành công"));
    }

    @DeleteMapping("/permissions/{id}")
    public ResponseEntity<RequestResponse> deletePermission(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok(new RequestResponse("Xóa permission thành công"));
    }

    @PostMapping("/permissions/sync")
    public ResponseEntity<RequestResponse> syncPermissions() {
        String result = permissionSyncer.sync();
        return ResponseEntity.ok(new RequestResponse(result, "Sync permission hoàn tất"));
    }

    // ============================================================
    // 3. ACCOUNT ROLE MANAGEMENT
    // ============================================================

    @GetMapping("/accounts/{accountId}/roles")
    public ResponseEntity<RequestResponse> getAccountRoles(@PathVariable Long accountId) {
        List<AccountRoleResponse> data = accountRoleService.getAccountRoles(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy role của account thành công"));
    }

    @PutMapping("/accounts/{accountId}/role")
    public ResponseEntity<RequestResponse> assignRoleToAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody AssignRoleRequest request) {
        accountRoleService.assignRoleToAccount(accountId, request);
        return ResponseEntity.ok(new RequestResponse("Gán role thành công"));
    }

    @DeleteMapping("/accounts/{accountId}/role")
    public ResponseEntity<RequestResponse> removeRoleFromAccount(@PathVariable Long accountId) {
        accountRoleService.removeRoleFromAccount(accountId);
        return ResponseEntity.ok(new RequestResponse("Xóa role khỏi account thành công"));
    }

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
    // 4. ACCOUNT MANAGEMENT
    // ============================================================

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

        Page<AccountResponse> data = accountRoleService.searchAccounts(roleCode, isActive, search, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách account thành công"));
    }

    @GetMapping("/accounts/{accountId}")
    public ResponseEntity<RequestResponse> getAccountById(@PathVariable Long accountId) {
        AccountResponse data = accountRoleService.getAccountById(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy account thành công"));
    }

    @GetMapping("/accounts/teachers")
    public ResponseEntity<RequestResponse> getTeacherAccounts() {
        List<AccountResponse> data = accountRoleService.getTeacherAccounts();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách teacher thành công"));
    }

    @PatchMapping("/accounts/{accountId}/lock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RequestResponse> lockAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody AccountLockRequest request) {
        accountRoleService.lockAccount(accountId, request);
        String msg = Boolean.TRUE.equals(request.getIsLocked())
                ? "Khóa tài khoản thành công"
                : "Mở khóa tài khoản thành công";
        return ResponseEntity.ok(new RequestResponse(msg));
    }
}