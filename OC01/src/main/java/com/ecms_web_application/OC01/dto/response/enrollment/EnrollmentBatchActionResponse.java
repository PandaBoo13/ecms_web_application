package com.ecms_web_application.OC01.dto.response.enrollment;

import java.util.List;

public record EnrollmentBatchActionResponse(
        int completed,
        int failed,
        List<Item> results
) {
    public record Item(Long enrollmentId, boolean success, String message) {}
}
