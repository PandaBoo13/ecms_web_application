package com.ecms_web_application.OC01.dto.response.enrollment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record GradeReviewStatusResponse(
        String status, // "DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"
        Long requestId,
        String requestCode,
        LocalDateTime requestedAt,
        String rejectReason,
        LocalDateTime resolvedAt,
        BigDecimal passScore,
        boolean canRecall
) {
    public static GradeReviewStatusResponse draft() {
        return new GradeReviewStatusResponse("DRAFT", null, null, null, null, null, null, false);
    }
}
