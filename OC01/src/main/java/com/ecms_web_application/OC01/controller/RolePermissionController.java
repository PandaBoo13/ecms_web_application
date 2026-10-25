package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.rbac.AssignPermissionRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AssignPermissionsBatchRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.rbac.AccountPermissionResponse;
import com.ecms_web_application.OC01.service.RolePermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rbac/roles/{roleId}/permissions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RolePermissionController {
    private final RolePermissionService service;

    @GetMapping
    public ResponseEntity<RequestResponse> list(@PathVariable Long roleId) {
        List<AccountPermissionResponse> data = service.listByRole(roleId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy quyền của role thành công"));
    }

    @PostMapping
    public ResponseEntity<RequestResponse> assign(@PathVariable Long roleId, @Valid @RequestBody AssignPermissionRequest req) {
        service.assign(roleId, req.getPermissionId());
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse("Gán quyền cho role thành công"));
    }

    @PostMapping("/batch")
    public ResponseEntity<RequestResponse> assignBatch(@PathVariable Long roleId, @Valid @RequestBody AssignPermissionsBatchRequest req) {
        service.assignBatch(roleId, req.getPermissionIds());
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse("Gán batch quyền cho role thành công"));
    }

    @DeleteMapping("/{permissionId}")
    public ResponseEntity<RequestResponse> remove(@PathVariable Long roleId, @PathVariable Long permissionId) {
        service.remove(roleId, permissionId);
        return ResponseEntity.ok(new RequestResponse("Xóa quyền khỏi role thành công"));
    }

    @DeleteMapping
    public ResponseEntity<RequestResponse> removeAll(@PathVariable Long roleId) {
        service.removeAll(roleId);
        return ResponseEntity.ok(new RequestResponse("Xóa tất cả quyền của role thành công"));
    }

    @PatchMapping("/{permissionId}/activate")
    public ResponseEntity<RequestResponse> activate(@PathVariable Long roleId, @PathVariable Long permissionId) {
        service.activate(roleId, permissionId);
        return ResponseEntity.ok(new RequestResponse("Kích hoạt thành công"));
    }

    @PatchMapping("/{permissionId}/deactivate")
    public ResponseEntity<RequestResponse> deactivate(@PathVariable Long roleId, @PathVariable Long permissionId) {
        service.deactivate(roleId, permissionId);
        return ResponseEntity.ok(new RequestResponse("Vô hiệu hóa thành công"));
    }
}