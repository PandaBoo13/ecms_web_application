package com.ecms_web_application.OC01.dto.response.tuition;

import java.time.LocalDateTime;

/**
 * Kết quả gửi link thanh toán. Link luôn được trả về để nhân viên sao chép gửi qua kênh khác,
 * kể cả khi gửi email thất bại (emailSent = false, emailError = lý do).
 */
public record PaymentLinkResponse(
        String paymentLink,
        String sentTo,
        LocalDateTime expiresAt,
        boolean emailSent,
        String emailError
) {
}
