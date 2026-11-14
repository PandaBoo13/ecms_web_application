package com.ecms_web_application.OC01.dto.response.tuition;

import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Thông tin hoá đơn hiển thị trên trang thanh toán công khai (không cần đăng nhập). Email đã che bớt. */
public record PublicInvoiceResponse(
        String invoiceCode,
        String courseTitle,
        LocalDate courseStartDate,
        BigDecimal amount,
        LocalDateTime dueAt,
        InvoiceStatus status,
        String payerName,
        String payerEmailMasked
) {
}
