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

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public void log(String action, String targetType, Long targetId, String detail) {
        try {
            Account actor = SecurityUtils.getCurrentAccount();
            AuditLog entry = new AuditLog();
            entry.setActorId(actor != null ? actor.getId() : null);
            entry.setAction(action);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Audit log failed: {}", e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLog> search(String targetType, String action, Long actorId, Pageable pageable) {
        return auditLogRepository.search(targetType, action, actorId, pageable);
    }
}