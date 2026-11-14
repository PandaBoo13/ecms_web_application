package com.ecms_web_application.OC01.dto.response.tuition;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Lead đã được tư vấn, đang chờ tạo hóa đơn học phí.
 * Chỉ hiển thị lead chưa chuyển thành học viên và chưa có hóa đơn mở.
 */
public record EligibleLeadResponse(
        Long leadId,
        String fullName,
        String email,
        String phone,
        Long courseId,
        String courseTitle,
        BigDecimal coursePrice,
        LocalDateTime consultedAt,
        Long assignedConsultantId,
        String note
) {
}
