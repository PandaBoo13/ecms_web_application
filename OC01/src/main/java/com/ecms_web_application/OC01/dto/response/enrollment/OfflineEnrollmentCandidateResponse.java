package com.ecms_web_application.OC01.dto.response.enrollment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record OfflineEnrollmentCandidateResponse(
        Long courseId,
        String courseTitle,
        LocalDate courseStartDate,
        Long invoiceId,
        String invoiceCode,
        LocalDateTime paidAt,
        BigDecimal amount,
        Long studentId,
        String studentCode,
        String fullName,
        String email,
        String phone,
        boolean hasStudentProfile,
        boolean hasLead
) {}
