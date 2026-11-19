package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.AuditLog;

import java.time.LocalDateTime;
import java.util.Map;

/** Một thay đổi điểm danh được ghi vào audit_log. */
public record AttendanceAuditLogResponse(
        Long id,
        Long actorId,
        String actorName,
        String action,
        LocalDateTime changedAt,
        Map<String, Object> oldValue,
        Map<String, Object> newValue
) {
    public static AttendanceAuditLogResponse from(AuditLog log, String actorName) {
        return new AttendanceAuditLogResponse(
                log.getId(), log.getActorId(), actorName, log.getAction(), log.getCreatedAt(),
                log.getOldValue(), log.getNewValue());
    }
}
