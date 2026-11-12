package com.ecms_web_application.OC01.dto.response.tuition;

import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;

import java.math.BigDecimal;

/**
 * Kết quả checkout công khai (không cần tài khoản).
 * Token có chữ ký dùng để mở cổng thanh toán VNPAY qua endpoint công khai.
 */
public record PublicCheckoutResponse(
        Long invoiceId,
        String invoiceCode,
        Long courseId,
        String courseTitle,
        BigDecimal amount,
        InvoiceStatus status,
        String paymentToken
) {
}
