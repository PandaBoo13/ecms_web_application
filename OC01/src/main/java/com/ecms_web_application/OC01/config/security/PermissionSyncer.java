package com.ecms_web_application.OC01.config.security;

import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.RolePermission;
import com.ecms_web_application.OC01.repository.PermissionRepository;
import com.ecms_web_application.OC01.repository.RolePermissionRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class PermissionSyncer implements ApplicationRunner {
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionManager permissionManager;
    private final ObjectMapper objectMapper;

    private static final String PERM_SEED = "permissions-seed.json";
    private static final String ROLE_PERM_SEED = "role-permission-seed.json";

    @Override
    @Transactional // 🆕 QUAN TRỌNG: Đặt @Transactional ở đây để bao trọn cả 2 hàm con
    public void run(ApplicationArguments args) {
        log.info("==> Bắt đầu đồng bộ Permission và Role...");
        String permResult = sync();
        String roleResult = syncRolePermissions();
        permissionManager.clearAllCache();
        log.info("==> Đồng bộ hoàn tất! API: [{}] | Role: [{}]", permResult, roleResult);
    }

    // Đã xóa @Transactional ở hàm con để tránh dư thừa
    public String sync() {
        try {
            List<Map<String, String>> items;
            try (InputStream is = new ClassPathResource(PERM_SEED).getInputStream()) {
                items = objectMapper.readValue(is, new TypeReference<>() {});
            }
            Map<String, Permission> dbMap = new HashMap<>();
            for (Permission p : permissionRepository.findAll()) {
                dbMap.put(p.getMethod() + ":" + p.getEndpointPattern(), p);
            }
            int inserted = 0, updated = 0, skipped = 0, failed = 0;
            for (Map<String, String> item : items) {
                try {
                    String method = item.get("method").toUpperCase();
                    String path = item.get("path");
                    String module = item.get("module");
                    String desc = item.get("description");
                    String key = method + ":" + path;
                    Permission existing = dbMap.get(key);
                    if (existing == null) {
                        Permission p = new Permission();
                        p.setMethod(method);
                        p.setEndpointPattern(path);
                        p.setModule(module);
                        p.setDescription(desc);
                        permissionRepository.save(p);
                        inserted++;
                    } else if (!Objects.equals(existing.getModule(), module) || !Objects.equals(existing.getDescription(), desc)) {
                        existing.setModule(module);
                        existing.setDescription(desc);
                        permissionRepository.save(existing);
                        updated++;
                    } else {
                        skipped++;
                    }
                } catch (Exception e) {
                    failed++;
                    log.warn("[PERM-SYNC] Lỗi item {}: {}", item, e.getMessage());
                }
            }
            String result = String.format("inserted=%d, updated=%d, skipped=%d, failed=%d", inserted, updated, skipped, failed);
            log.info("[PERM-SYNC] {}", result);
            return result;
        } catch (Exception e) {
            log.error("[PERM-SYNC] Sync thất bại", e);
            return "ERROR: " + e.getMessage();
        }
    }

    // Đã xóa @Transactional ở hàm con để tránh dư thừa
    public String syncRolePermissions() {
        try {
            Map<String, List<String>> roleConfig;
            try (InputStream is = new ClassPathResource(ROLE_PERM_SEED).getInputStream()) {
                roleConfig = objectMapper.readValue(is, new TypeReference<>() {});
            }
            List<Permission> allPermissions = permissionRepository.findAll();
            Map<String, Permission> permMap = new HashMap<>();
            for (Permission p : allPermissions) {
                permMap.put(p.getMethod() + ":" + p.getEndpointPattern(), p);
            }
            int totalAssigned = 0;
            int rolesProcessed = 0;
            for (Map.Entry<String, List<String>> entry : roleConfig.entrySet()) {
                String roleCode = entry.getKey();
                List<String> allowedApiKeys = entry.getValue();
                Optional<Role> roleOpt = roleRepository.findByCode(roleCode);
                if (roleOpt.isEmpty()) {
                    log.warn("[ROLE-PERM-SYNC] Role '{}' không tồn tại trong DB, bỏ qua.", roleCode);
                    continue;
                }
                Role role = roleOpt.get();
                rolesProcessed++;
                
                // Hàm delete này cần Transaction, giờ đã được bao bọc bởi run()
                rolePermissionRepository.deleteAllByRoleId(role.getId()); 
                
                List<RolePermission> toSaves = new ArrayList<>();
                boolean grantAll = allowedApiKeys.contains("*");
                if (grantAll) {
                    for (Permission p : allPermissions) {
                        toSaves.add(createRolePermission(role, p));
                    }
                } else {
                    for (String apiKey : allowedApiKeys) {
                        Permission p = permMap.get(apiKey);
                        if (p != null) {
                            toSaves.add(createRolePermission(role, p));
                        } else {
                            log.warn("[ROLE-PERM-SYNC] Không tìm thấy API '{}' trong DB cho role '{}'", apiKey, roleCode);
                        }
                    }
                }
                if (!toSaves.isEmpty()) {
                    rolePermissionRepository.saveAll(toSaves);
                    totalAssigned += toSaves.size();
                }
                log.info("[ROLE-PERM-SYNC] Đã nạp {} quyền cho Role {}", toSaves.size(), roleCode);
            }
            String result = String.format("roles=%d, totalPermissions=%d", rolesProcessed, totalAssigned);
            log.info("[ROLE-PERM-SYNC] {}", result);
            return result;
        } catch (Exception e) {
            log.error("[ROLE-PERM-SYNC] Lỗi đồng bộ Role Permission", e);
            return "ERROR: " + e.getMessage();
        }
    }

    private RolePermission createRolePermission(Role role, Permission permission) {
        RolePermission rp = new RolePermission();
        rp.setRole(role);
        rp.setPermission(permission);
        rp.setIsEnabled(true);
        return rp;
    }
}