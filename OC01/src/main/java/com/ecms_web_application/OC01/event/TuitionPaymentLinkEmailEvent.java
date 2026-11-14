package com.ecms_web_application.OC01.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Yêu cầu gửi email link thanh toán SAU KHI transaction tạo hóa đơn đã commit.
 * <p>
 * SMTP (Gmail) mất khoảng 3–4 giây cho mỗi email, nên email được đẩy sang thread nền
 * để API tạo hóa đơn trả về ngay, đồng thời tránh giữ transaction/khóa khóa học trong lúc chờ SMTP.
 */
public record TuitionPaymentLinkEmailEvent(
        Long invoiceId,
        String recipient,
        String payerName,
        String invoiceCode,
        String courseTitle,
        BigDecimal amount,
        LocalDateTime dueAt,
        String paymentLink
) {
}
