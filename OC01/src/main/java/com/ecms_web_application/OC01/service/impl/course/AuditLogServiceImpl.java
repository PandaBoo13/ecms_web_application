package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.AuditLog;
import com.ecms_web_application.OC01.repository.AuditLogRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public void log(String action, String entityType, Long entityId, String detail) {
        try {
            Account actor = SecurityUtils.getCurrentAccount();
            if (actor == null) {
                log.debug("[AUDIT] Skip — no auth context");
                return;
            }
            AuditLog entry = new AuditLog();
            entry.setActorId(actor.getId());
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            if (detail != null && !detail.isBlank()) {
                Map<String, Object> nv = new HashMap<>();
                nv.put("detail", detail);
                entry.setNewValue(nv);
            }
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("[AUDIT] Failed: {}", e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> search(String entityType, String action, Long actorId, Pageable pageable) {
        return auditLogRepository.search(
                emptyToBlank(entityType),
                emptyToBlank(action),
                actorId,
                pageable
        );
    }

    private String emptyToBlank(String s) {
        return (s == null || s.isBlank()) ? "" : s.trim();
    }
}