package com.ecms_web_application.OC01.dto.response.tuition;

public record RefundApprovalStatusResponse(
        String status,
        Long requestId,
        String requestCode,
        java.time.LocalDateTime requestedAt,
        String rejectReason,
        java.time.LocalDateTime resolvedAt,
        java.math.BigDecimal requestedAmount,
        String reason,
        boolean canRecordRefund
) {
    public static RefundApprovalStatusResponse none() {
        return new RefundApprovalStatusResponse("NONE", null, null, null, null, null, null, null, false);
    }
}
