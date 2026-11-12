package com.ecms_web_application.OC01.dto.response.enrollment;

import java.util.List;

public record PendingEnrollmentBatchResponse(
        int enrolled,
        int failed,
        List<Item> results
) {
    public record Item(Long invoiceId, boolean success, Long enrollmentId, String message) {}
}
