package com.ecms_web_application.OC01.service.impl.rbac;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.AntPathMatcher;
import com.ecms_web_application.OC01.config.security.PermissionManager;
import com.ecms_web_application.OC01.dto.request.rbac.AssignPermissionRequest;
import com.ecms_web_application.OC01.dto.request.rbac.AssignPermissionsBatchRequest;
import com.ecms_web_application.OC01.dto.response.rbac.AccountPermissionResponse;
import com.ecms_web_application.OC01.dto.response.rbac.PermissionCheckResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.AccountPermission;
import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountPermissionRepository;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.PermissionRepository;
import com.ecms_web_application.OC01.service.AccountPermissionService;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountPermissionServiceImpl implements AccountPermissionService {

    private final AccountRepository accountRepository;
    private final PermissionRepository permissionRepository;
    private final AccountPermissionRepository accountPermissionRepository;
    private final PermissionManager permissionManager;

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    // ============================================================
    // QUERY
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public List<AccountPermissionResponse> getAllAccountPermissions(Long accountId) {
        ensureAccountExists(accountId);
        return accountPermissionRepository
                .findWithPermissionDetailByAccountId(accountId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountPermissionResponse> getCustomAccountPermissions(Long accountId) {
        ensureAccountExists(accountId);
        return accountPermissionRepository
                .findByAccount_Id(accountId)
                .stream()
                .map(ap -> toResponse(ap, ap.getPermission()))
                .toList();
    }

    // ============================================================
    // ASSIGN
    // ============================================================
    @Override
    @Transactional
    public void assignPermission(Long accountId, AssignPermissionRequest request) {
        Account account = getAccountOrThrow(accountId);
        Permission permission = getPermissionOrThrow(request.getPermissionId());

        Optional<AccountPermission> existing =
                accountPermissionRepository.findByAccount_IdAndPermission_Id(accountId, permission.getId());

        if (existing.isPresent()) {
            AccountPermission ap = existing.get();
            if (Boolean.TRUE.equals(ap.getIsEnabled())) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Quyền đã được gán và đang hoạt động");
            }
            ap.setIsEnabled(true);
            accountPermissionRepository.save(ap);
        } else {
            AccountPermission ap = new AccountPermission();
            ap.setAccount(account);
            ap.setPermission(permission);
            ap.setIsEnabled(true);
            accountPermissionRepository.save(ap);
        }

        permissionManager.clearCache(accountId);
        log.info("Gán permission {} cho account {}", permission.getId(), accountId);
    }

    @Override
    @Transactional
    public void assignPermissionsBatch(Long accountId, AssignPermissionsBatchRequest request) {
        Account account = getAccountOrThrow(accountId);
        List<Long> ids = request.getPermissionIds();

        List<Permission> permissions = permissionRepository.findAllById(ids);
        if (permissions.size() != ids.size()) {
            Set<Long> found = permissions.stream().map(Permission::getId).collect(Collectors.toSet());
            List<Long> missing = ids.stream().filter(id -> !found.contains(id)).toList();
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Permission không tồn tại: " + missing);
        }

        Map<Long, AccountPermission> existingMap = accountPermissionRepository
                .findByAccount_Id(accountId)
                .stream()
                .collect(Collectors.toMap(ap -> ap.getPermission().getId(), ap -> ap));

        List<AccountPermission> toSave = new ArrayList<>();
        for (Permission p : permissions) {
            AccountPermission existing = existingMap.get(p.getId());
            if (existing != null) {
                if (!Boolean.TRUE.equals(existing.getIsEnabled())) {
                    existing.setIsEnabled(true);
                    toSave.add(existing);
                }
            } else {
                AccountPermission ap = new AccountPermission();
                ap.setAccount(account);
                ap.setPermission(p);
                ap.setIsEnabled(true);
                toSave.add(ap);
            }
        }

        if (!toSave.isEmpty()) {
            accountPermissionRepository.saveAll(toSave);
        }
        permissionManager.clearCache(accountId);
        log.info("Gán batch {} permission cho account {}", toSave.size(), accountId);
    }

    // ============================================================
    // REMOVE / ACTIVATE / DEACTIVATE
    // ============================================================
    @Override
    @Transactional
    public void removePermission(Long accountId, Long permissionId) {
        AccountPermission ap = accountPermissionRepository
                .findByAccount_IdAndPermission_Id(accountId, permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account chưa có quyền này"));

        accountPermissionRepository.delete(ap);
        permissionManager.clearCache(accountId);
    }

    @Override
    @Transactional
    public void deactivatePermission(Long accountId, Long permissionId) {
        AccountPermission ap = accountPermissionRepository
                .findByAccount_IdAndPermission_Id(accountId, permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account chưa có quyền này"));

        if (!Boolean.TRUE.equals(ap.getIsEnabled())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Quyền đã bị vô hiệu hóa");
        }
        ap.setIsEnabled(false);
        accountPermissionRepository.save(ap);
        permissionManager.clearCache(accountId);
    }

    @Override
    @Transactional
    public void activatePermission(Long accountId, Long permissionId) {
        AccountPermission ap = accountPermissionRepository
                .findByAccount_IdAndPermission_Id(accountId, permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account chưa có quyền này"));

        if (Boolean.TRUE.equals(ap.getIsEnabled())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Quyền đã đang hoạt động");
        }
        ap.setIsEnabled(true);
        accountPermissionRepository.save(ap);
        permissionManager.clearCache(accountId);
    }

    @Override
    @Transactional
    public void removeAllPermissions(Long accountId) {
        ensureAccountExists(accountId);
        accountPermissionRepository.deleteAllByAccountId(accountId);
        permissionManager.clearCache(accountId);
    }

    // ============================================================
    // CHECK
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public PermissionCheckResponse checkPermission(Long accountId, String permissionName) {
        ensureAccountExists(accountId);
        String[] parts = permissionName.split(":", 2);
        if (parts.length != 2) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "permissionName phải có format '{METHOD}:{endpoint}'");
        }
        boolean has = hasPermission(accountId, parts[0], parts[1]);

        PermissionCheckResponse res = new PermissionCheckResponse();
        res.setAccountId(accountId);
        res.setPermissionName(permissionName);
        res.setHasPermission(has);
        res.setMessage(has ? "Account có quyền" : "Account không có quyền");
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionCheckResponse checkPermissionByResource(Long accountId, String resource, String action) {
        ensureAccountExists(accountId);
        boolean has = permissionRepository.findByModule(resource).stream()
                .anyMatch(p -> p.getMethod().equalsIgnoreCase(action)
                        && accountPermissionRepository
                        .existsByAccount_IdAndPermission_IdAndIsEnabledTrue(accountId, p.getId()));

        PermissionCheckResponse res = new PermissionCheckResponse();
        res.setAccountId(accountId);
        res.setResource(resource);
        res.setAction(action);
        res.setHasPermission(has);
        res.setMessage(has ? "Account có quyền" : "Account không có quyền");
        return res;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasPermission(Long accountId, String method, String endpoint) {
        if (accountId == null || method == null || endpoint == null) return false;

        String upperMethod = method.toUpperCase();
        String normalizedEndpoint = normalizePath(endpoint);

        Map<String, List<String>> cached = permissionManager.getPermissions(accountId);
        if (cached == null) {
            cached = loadAndCachePermissions(accountId);
        }

        List<String> patterns = cached.get(upperMethod);
        if (patterns == null || patterns.isEmpty()) return false;

        for (String pattern : patterns) {
            if (pathMatcher.match(pattern, normalizedEndpoint)) {
                return true;
            }
        }
        return false;
    }

    // ============================================================
    // HELPERS
    // ============================================================
    private Map<String, List<String>> loadAndCachePermissions(Long accountId) {
        List<Permission> permissions =
                accountPermissionRepository.findEnabledPermissionsByAccountId(accountId);

        Map<String, List<String>> grouped = permissions.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getMethod().toUpperCase(),
                        Collectors.mapping(Permission::getEndpointPattern, Collectors.toList())
                ));

        permissionManager.putPermissions(accountId, grouped);
        return grouped;
    }

    private String normalizePath(String path) {
        if (path == null) return "/";
        if (path.length() > 1 && path.endsWith("/")) {
            return path.substring(0, path.length() - 1);
        }
        return path;
    }

    private Account getAccountOrThrow(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Account không tồn tại"));
    }

    private Permission getPermissionOrThrow(Long permissionId) {
        return permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Permission không tồn tại"));
    }

    private void ensureAccountExists(Long accountId) {
        if (!accountRepository.existsById(accountId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Account không tồn tại");
        }
    }

    private AccountPermissionResponse toResponse(AccountPermission ap) {
        return toResponse(ap, ap.getPermission());
    }

    private AccountPermissionResponse toResponse(AccountPermission ap, Permission p) {
        AccountPermissionResponse res = new AccountPermissionResponse();
        res.setPermissionId(p.getId());
        res.setMethod(p.getMethod());
        res.setEndpointPattern(p.getEndpointPattern());
        res.setModule(p.getModule());
        res.setDescription(p.getDescription());
        res.setIsEnabled(ap.getIsEnabled());
        res.setAssignedAt(ap.getAssignedAt());
        res.setUpdatedAt(ap.getUpdatedAt());
        return res;
    }
}