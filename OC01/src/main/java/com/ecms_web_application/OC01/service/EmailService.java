package com.ecms_web_application.OC01.service;

import java.time.LocalDateTime;

/**
 * Service gửi email giao dịch.
 */
public interface EmailService {
    void sendOtpEmail(String to, String otp);
    void sendPasswordChangedEmail(String to);
    void sendAccountLockedEmail(String to, String fullName, String reason, LocalDateTime lockedUntil);

    /** Gửi link thanh toán học phí (chuyển khoản/VNPAY) cho người nộp. */
    void sendTuitionPaymentLinkEmail(String to, String fullName, String invoiceCode, String courseTitle,
                                     java.math.BigDecimal amount, LocalDateTime dueAt, String paymentLink);

    /** Gửi hóa đơn/xác nhận thanh toán học phí sau khi hóa đơn được ghi nhận PAID. */
    void sendTuitionPaidInvoiceEmail(String to, String fullName, String phone, String invoiceCode,
                                     LocalDateTime invoiceCreatedAt, String courseCode, String courseTitle,
                                     LocalDateTime paidAt, java.math.BigDecimal amount, String paymentMethod,
                                     String transactionReference);
}
