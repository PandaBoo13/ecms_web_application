package com.ecms_web_application.OC01.config.security;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PermissionManager {

    // accountId → Map<METHOD, List<pattern>>
    private final Map<Long, Map<String, List<String>>> accountPermissions = new ConcurrentHashMap<>();

    public Map<String, List<String>> getPermissions(Long accountId) {
        return accountPermissions.get(accountId);
    }

    public void putPermissions(Long accountId, Map<String, List<String>> permissions) {
        accountPermissions.put(accountId, permissions);
    }

    public void clearCache(Long accountId) {
        accountPermissions.remove(accountId);
    }

    public void clearAllCache() {
        accountPermissions.clear();
    }
}