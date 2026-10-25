package com.ecms_web_application.OC01.config.security;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PermissionManager {
    
    // Chỉ lưu cache quyền của ROLE
    private final Map<Long, Map<String, List<String>>> rolePermissions = new ConcurrentHashMap<>();

    public Map<String, List<String>> getPermissionsByRole(Long roleId) {
        return rolePermissions.get(roleId);
    }

    public void putPermissionsByRole(Long roleId, Map<String, List<String>> permissions) {
        rolePermissions.put(roleId, permissions);
    }

    public void clearCacheByRole(Long roleId) {
        rolePermissions.remove(roleId);
    }

    public void clearAllCache() {
        rolePermissions.clear();
    }
}