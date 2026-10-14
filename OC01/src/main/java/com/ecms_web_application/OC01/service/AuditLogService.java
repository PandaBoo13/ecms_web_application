package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditLogService {
    void log(String action, String entityType, Long entityId, String detail);
    Page<AuditLog> search(String entityType, String action, Long actorId, Pageable pageable);
}