package com.ecms_web_application.OC01.service;

public interface AccountPermissionService {
    boolean hasPermission(Long accountId, String method, String endpoint);
}