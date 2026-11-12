package com.ecms_web_application.OC01.event;

/** Phát ra sau khi chứng từ hoàn tiền được ghi nhận thành công. */
public record InvoiceRefundedEvent(Long refundInvoiceId) { }
