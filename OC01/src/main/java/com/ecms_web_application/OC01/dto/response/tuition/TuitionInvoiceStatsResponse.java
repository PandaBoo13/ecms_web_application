package com.ecms_web_application.OC01.dto.response.tuition;

/**
 * Thống kê số lượng hóa đơn học phí theo trạng thái.
 * Một request duy nhất thay cho 5 lần gọi danh sách chỉ để lấy tổng số bản ghi.
 */
public record TuitionInvoiceStatsResponse(
        long total,
        long pending,
        long paid,
        long overdue,
        long cancelled
) {
}
