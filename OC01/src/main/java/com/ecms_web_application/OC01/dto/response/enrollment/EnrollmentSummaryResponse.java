package com.ecms_web_application.OC01.dto.response.enrollment;

public record EnrollmentSummaryResponse(
        long pending,
        long active,
        long reserved,
        long terminated,
        long completed,
        long offlineAwaitingEnrollment
) {}
