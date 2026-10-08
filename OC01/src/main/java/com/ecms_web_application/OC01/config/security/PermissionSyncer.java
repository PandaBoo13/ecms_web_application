package com.ecms_web_application.OC01.config.security;

import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.repository.PermissionRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Sync permission từ permissions-seed.json vào DB khi khởi động.
 * Gọi lại API POST /api/rbac/permissions/sync để sync thủ công.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PermissionSyncer implements ApplicationRunner {

    private final PermissionRepository permissionRepository;
    private final PermissionManager permissionManager;
    private final ObjectMapper objectMapper;

    private static final String SEED_FILE = "permissions-seed.json";

    @Override
    public void run(ApplicationArguments args) {
        sync();
    }

    /**
     * Sync thủ công — gọi từ controller hoặc startup.
     * @return chuỗi mô tả kết quả: "inserted=X, updated=Y, skipped=Z, failed=W"
     */
    @Transactional
    public String sync() {
        try {
            // ── 1. Đọc file JSON ──
            List<Map<String, String>> items;
            try (InputStream is = new ClassPathResource(SEED_FILE).getInputStream()) {
                items = objectMapper.readValue(is, new TypeReference<>() {});
            }

            // ── 2. Load DB → map theo key "METHOD:path" ──
            Map<String, Permission> dbMap = new HashMap<>();
            for (Permission p : permissionRepository.findAll()) {
                dbMap.put(p.getMethod() + ":" + p.getEndpointPattern(), p);
            }

            // ── 3. Diff + upsert ──
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

                    } else if (!Objects.equals(existing.getModule(), module)
                            || !Objects.equals(existing.getDescription(), desc)) {
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

            // ── 4. Clear cache ──
            if (inserted > 0 || updated > 0) {
                permissionManager.clearAllCache();
            }

            String result = String.format(
                    "inserted=%d, updated=%d, skipped=%d, failed=%d", inserted, updated, skipped, failed);
            log.info("[PERM-SYNC] {}", result);
            return result;

        } catch (Exception e) {
            log.error("[PERM-SYNC] Sync thất bại", e);
            return "ERROR: " + e.getMessage();
        }
    }
}