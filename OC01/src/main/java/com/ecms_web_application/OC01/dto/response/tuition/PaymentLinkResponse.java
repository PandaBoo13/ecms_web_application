package com.ecms_web_application.OC01.dto.response.tuition;

import java.time.LocalDateTime;

/**
 * Kết quả tạo/gửi lại link thanh toán. Link luôn được trả về để nhân viên sao chép gửi qua kênh khác.
 * <p>
 * Email được gửi nền sau khi transaction commit: emailSent = true nghĩa là email đã được xếp hàng
 * gửi, lỗi SMTP (nếu có) chỉ được ghi log ở thread nền.
 */
public record PaymentLinkResponse(
        String paymentLink,
        String sentTo,
        LocalDateTime expiresAt,
        boolean emailSent,
        String emailError
) {
}
