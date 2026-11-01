package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.EnrollmentStatusLog;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;

import java.time.LocalDateTime;

public record EnrollmentStatusLogResponse(
        Long id,
        EnrollmentStatus oldStatus,
        EnrollmentStatus newStatus,
        String reason,
        Long changedBy,
        LocalDateTime changedAt
) {
    public static EnrollmentStatusLogResponse from(EnrollmentStatusLog log) {
        return new EnrollmentStatusLogResponse(log.getId(), log.getOldStatus(), log.getNewStatus(),
                log.getReason(), log.getChangedBy(), log.getChangedAt());
    }
}
