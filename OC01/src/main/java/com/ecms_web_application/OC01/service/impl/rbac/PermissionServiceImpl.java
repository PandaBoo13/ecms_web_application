package com.ecms_web_application.OC01.service.impl.rbac;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.AntPathMatcher;
import com.ecms_web_application.OC01.config.security.PermissionManager;
import com.ecms_web_application.OC01.dto.request.rbac.PermissionRequest;
import com.ecms_web_application.OC01.dto.response.rbac.PermissionResponse;
import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountPermissionRepository;
import com.ecms_web_application.OC01.repository.PermissionRepository;
import com.ecms_web_application.OC01.service.PermissionService;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final AccountPermissionRepository accountPermissionRepository;
    private final PermissionManager permissionManager;

    /** ⚠️ ĐỔI: module mặc định — "public" cho mọi user authenticated */
    private static final String DEFAULT_MODULE = "public";

    @Override
    @Transactional(readOnly = true)
    public Page<PermissionResponse> searchPermissions(String module, String search, Pageable pageable) {
        return permissionRepository
                .searchPermissions(emptyToNull(module), emptyToNull(search), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> getDefaultPermissions() {
        return permissionRepository.findByModule(DEFAULT_MODULE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(Long permissionId) {
        Permission p = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Permission không tồn tại"));
        return toResponse(p);
    }

    @Override
    @Transactional
    public PermissionResponse createPermission(PermissionRequest request) {
        if (permissionRepository.existsByMethodAndEndpointPattern(
                request.getMethod(), request.getEndpointPattern())) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Permission đã tồn tại: " + request.getMethod() + " " + request.getEndpointPattern());
        }

        Permission p = new Permission();
        p.setMethod(request.getMethod());
        p.setEndpointPattern(request.getEndpointPattern());
        p.setModule(request.getModule());
        p.setDescription(request.getDescription());

        Permission saved = permissionRepository.save(p);
        log.info("Tạo permission: {} {}", saved.getMethod(), saved.getEndpointPattern());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public PermissionResponse updatePermission(Long permissionId, PermissionRequest request) {
        Permission p = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Permission không tồn tại"));

        boolean changingKey = !p.getMethod().equals(request.getMethod())
                || !p.getEndpointPattern().equals(request.getEndpointPattern());

        if (changingKey && permissionRepository.existsByMethodAndEndpointPattern(
                request.getMethod(), request.getEndpointPattern())) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Permission đã tồn tại: " + request.getMethod() + " " + request.getEndpointPattern());
        }

        p.setMethod(request.getMethod());
        p.setEndpointPattern(request.getEndpointPattern());
        p.setModule(request.getModule());
        p.setDescription(request.getDescription());

        Permission saved = permissionRepository.save(p);
        permissionManager.clearAllCache();
        log.info("Cập nhật permission id={}", permissionId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deletePermission(Long permissionId) {
        Permission p = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Permission không tồn tại"));

        permissionRepository.delete(p);
        permissionManager.clearAllCache();
        log.info("Xóa permission: {} {}", p.getMethod(), p.getEndpointPattern());
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getDistinctModules() {
        return permissionRepository.findAllDistinctModules();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByMethodAndEndpoint(String method, String endpoint) {
        List<Permission> candidates = permissionRepository.findByMethod(method.toUpperCase());

        AntPathMatcher matcher = new AntPathMatcher();
        for (Permission p : candidates) {
            if (matcher.match(p.getEndpointPattern(), endpoint)) {
                return true;
            }
        }
        return false;
    }

    private PermissionResponse toResponse(Permission p) {
        PermissionResponse res = new PermissionResponse();
        res.setId(p.getId());
        res.setMethod(p.getMethod());
        res.setEndpointPattern(p.getEndpointPattern());
        res.setModule(p.getModule());
        res.setDescription(p.getDescription());
        res.setCreatedAt(p.getCreatedAt());
        res.setUpdatedAt(p.getUpdatedAt());
        return res;
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}