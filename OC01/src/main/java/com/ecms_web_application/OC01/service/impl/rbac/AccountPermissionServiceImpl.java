package com.ecms_web_application.OC01.service.impl.rbac;

import com.ecms_web_application.OC01.config.security.PermissionManager;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.RolePermissionRepository;
import com.ecms_web_application.OC01.service.AccountPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.AntPathMatcher;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountPermissionServiceImpl implements AccountPermissionService {

    private final AccountRepository accountRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionManager permissionManager;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    @Transactional(readOnly = true)
    public boolean hasPermission(Long accountId, String method, String endpoint) {
        if (accountId == null || method == null || endpoint == null) return false;

        String upperMethod = method.toUpperCase();
        String normalizedEndpoint = normalizePath(endpoint);

        // 1. Tìm Account
        Account account = accountRepository.findById(accountId).orElse(null);
        if (account == null || account.getRole() == null) return false;

        Long roleId = account.getRole().getId();
        Map<String, List<String>> cachedByRole = permissionManager.getPermissionsByRole(roleId);
        
        // 2. Nếu chưa có Cache của Role thì load từ DB
        if (cachedByRole == null) {
            cachedByRole = loadAndCacheRolePermissions(roleId);
        }

        // 3. Kiểm tra quyền
        List<String> methodPatterns = cachedByRole.get(upperMethod);
        if (methodPatterns == null || methodPatterns.isEmpty()) return false;

        for (String p : methodPatterns) {
            if (pathMatcher.match(p, normalizedEndpoint)) return true;
        }
        return false;
    }

    private Map<String, List<String>> loadAndCacheRolePermissions(Long roleId) {
        List<Permission> permissions = rolePermissionRepository.findEnabledPermissionsByRoleId(roleId);
        Map<String, List<String>> grouped = permissions.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getMethod().toUpperCase(),
                        Collectors.mapping(Permission::getEndpointPattern, Collectors.toList())
                ));
        permissionManager.putPermissionsByRole(roleId, grouped);
        return grouped;
    }

    private String normalizePath(String path) {
        if (path == null) return "/";
        if (path.length() > 1 && path.endsWith("/")) return path.substring(0, path.length() - 1);
        return path;
    }
}