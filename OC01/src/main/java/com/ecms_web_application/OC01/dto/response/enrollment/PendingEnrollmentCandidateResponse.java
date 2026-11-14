package com.ecms_web_application.OC01.dto.response.enrollment;

import com.ecms_web_application.OC01.entity.enums.CourseType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Hóa đơn học phí đã thanh toán nhưng chưa có ghi danh (ONLINE hoặc OFFLINE).
 * Dùng cho danh sách đối soát để admin ghi danh lại thủ công.
 */
public record PendingEnrollmentCandidateResponse(
        Long courseId,
        CourseType courseType,
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
