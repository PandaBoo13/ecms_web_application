package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.service.EmailService;
import com.ecms_web_application.OC01.service.impl.TemporaryCredentialStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Gửi email hóa đơn đã thanh toán ở thread nền.
 * <p>
 * Listener giữ vai trò chuẩn bị dữ liệu (người nhận, mật khẩu tạm) theo đúng thứ tự sau commit,
 * còn thao tác SMTP 3–4 giây được đẩy sang executor để không chặn response.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaidInvoiceEmailDispatcher {
    private final EmailService emailService;
    private final TemporaryCredentialStore temporaryCredentialStore;

    @Async("notificationExecutor")
    public void send(Payload payload) {
        try {
            emailService.sendTuitionPaidInvoiceEmail(
                    payload.to(), payload.fullName(), payload.phone(), payload.invoiceCode(),
                    payload.invoiceCreatedAt(), payload.courseCode(), payload.courseTitle(),
                    payload.paidAt(), payload.amount(), payload.paymentMethod(),
                    payload.transactionReference(), payload.loginEmail(), payload.temporaryPassword());
            // Chỉ xóa mật khẩu tạm sau khi SMTP gửi thành công để có thể retry khi gửi lỗi.
            if (payload.temporaryPassword() != null && !payload.temporaryPassword().isBlank()) {
                temporaryCredentialStore.consume(payload.loginEmail());
            }
            log.info("[Email] Đã gửi hóa đơn {} tới {}", payload.invoiceCode(), payload.to());
        } catch (Exception ex) {
            // Email lỗi không được làm hỏng nghiệp vụ thanh toán đã commit.
            log.warn("[Email] Gửi hóa đơn {} tới {} thất bại: {}",
                    payload.invoiceCode(), payload.to(), ex.getMessage());
        }
    }

    public record Payload(
            String to,
            String fullName,
            String phone,
            String invoiceCode,
            LocalDateTime invoiceCreatedAt,
            String courseCode,
            String courseTitle,
            LocalDateTime paidAt,
            BigDecimal amount,
            String paymentMethod,
            String transactionReference,
            String loginEmail,
            String temporaryPassword
    ) {
    }
}
