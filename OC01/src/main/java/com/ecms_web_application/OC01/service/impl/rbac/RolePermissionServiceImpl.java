package com.ecms_web_application.OC01.service.impl.rbac;

import com.ecms_web_application.OC01.config.security.PermissionManager;
import com.ecms_web_application.OC01.dto.response.rbac.AccountPermissionResponse;
import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.RolePermission;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.PermissionRepository;
import com.ecms_web_application.OC01.repository.RolePermissionRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.ecms_web_application.OC01.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RolePermissionServiceImpl implements RolePermissionService {
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionManager permissionManager;

    @Override
    @Transactional(readOnly = true)
    public List<AccountPermissionResponse> listByRole(Long roleId) {
        if (!roleRepository.existsById(roleId)) throw new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại");
        return rolePermissionRepository.findWithPermissionDetailByRoleId(roleId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public void assign(Long roleId, Long permissionId) {
        Role role = roleRepository.findById(roleId).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        Permission permission = permissionRepository.findById(permissionId).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Permission không tồn tại"));

        Optional<RolePermission> existing = rolePermissionRepository.findByRole_IdAndPermission_Id(roleId, permissionId);
        if (existing.isPresent()) {
            RolePermission rp = existing.get();
            if (Boolean.TRUE.equals(rp.getIsEnabled())) throw new ErrorHandler(HttpStatus.CONFLICT, "Role đã có quyền này");
            rp.setIsEnabled(true);
            rolePermissionRepository.save(rp);
        } else {
            RolePermission rp = new RolePermission();
            rp.setRole(role);
            rp.setPermission(permission);
            rp.setIsEnabled(true);
            rolePermissionRepository.save(rp);
        }
        permissionManager.clearCacheByRole(roleId);
    }

    @Override
    @Transactional
    public void assignBatch(Long roleId, List<Long> permissionIds) {
        Role role = roleRepository.findById(roleId).orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        if (permissionIds == null || permissionIds.isEmpty()) return;

        List<Permission> permissions = permissionRepository.findAllById(permissionIds);
        if (permissions.size() != permissionIds.size()) {
            Set<Long> found = permissions.stream().map(Permission::getId).collect(Collectors.toSet());
            List<Long> missing = permissionIds.stream().filter(id -> !found.contains(id)).toList();
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Permission không tồn tại: " + missing);
        }

        Map<Long, RolePermission> existingMap = rolePermissionRepository.findByRole_Id(roleId).stream()
                .collect(Collectors.toMap(rp -> rp.getPermission().getId(), rp -> rp));

        List<RolePermission> toSave = new ArrayList<>();
        for (Permission p : permissions) {
            RolePermission existing = existingMap.get(p.getId());
            if (existing != null) {
                if (!Boolean.TRUE.equals(existing.getIsEnabled())) {
                    existing.setIsEnabled(true);
                    toSave.add(existing);
                }
            } else {
                RolePermission rp = new RolePermission();
                rp.setRole(role);
                rp.setPermission(p);
                rp.setIsEnabled(true);
                toSave.add(rp);
            }
        }
        if (!toSave.isEmpty()) rolePermissionRepository.saveAll(toSave);
        permissionManager.clearCacheByRole(roleId);
    }

    @Override
    @Transactional
    public void remove(Long roleId, Long permissionId) {
        RolePermission rp = rolePermissionRepository.findByRole_IdAndPermission_Id(roleId, permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role chưa có quyền này"));
        rolePermissionRepository.delete(rp);
        permissionManager.clearCacheByRole(roleId);
    }

    @Override
    @Transactional
    public void removeAll(Long roleId) {
        if (!roleRepository.existsById(roleId)) throw new ErrorHandler(HttpStatus.NOT_FOUND, "Role không tồn tại");
        rolePermissionRepository.deleteAllByRoleId(roleId);
        permissionManager.clearCacheByRole(roleId);
    }

    @Override
    @Transactional
    public void activate(Long roleId, Long permissionId) {
        RolePermission rp = rolePermissionRepository.findByRole_IdAndPermission_Id(roleId, permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role chưa có quyền này"));
        rp.setIsEnabled(true);
        rolePermissionRepository.save(rp);
        permissionManager.clearCacheByRole(roleId);
    }

    @Override
    @Transactional
    public void deactivate(Long roleId, Long permissionId) {
        RolePermission rp = rolePermissionRepository.findByRole_IdAndPermission_Id(roleId, permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Role chưa có quyền này"));
        rp.setIsEnabled(false);
        rolePermissionRepository.save(rp);
        permissionManager.clearCacheByRole(roleId);
    }

    private AccountPermissionResponse toResponse(RolePermission rp) {
        Permission p = rp.getPermission();
        AccountPermissionResponse r = new AccountPermissionResponse();
        r.setPermissionId(p.getId());
        r.setMethod(p.getMethod());
        r.setEndpointPattern(p.getEndpointPattern());
        r.setModule(p.getModule());
        r.setDescription(p.getDescription());
        r.setIsEnabled(rp.getIsEnabled());
        r.setAssignedAt(rp.getAssignedAt());
        r.setUpdatedAt(rp.getUpdatedAt());
        return r;
    }
}