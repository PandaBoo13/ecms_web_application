package com.ecms_web_application.OC01.dto.response.enrollment;

import java.util.List;

public record FinalScoreImportResponse(
        int updated,
        int skipped,
        List<RowIssue> issues
) {
    public record RowIssue(int row, Long enrollmentId, String message) {}
}
