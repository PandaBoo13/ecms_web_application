package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.event.TuitionPaymentLinkEmailEvent;
import com.ecms_web_application.OC01.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Gửi email link thanh toán ở thread nền, chỉ sau khi hóa đơn đã được commit.
 * Nhờ vậy API tạo hóa đơn không phải chờ SMTP và không gửi email cho giao dịch bị rollback.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TuitionPaymentLinkEmailListener {
    private final EmailService emailService;

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void sendPaymentLinkEmail(TuitionPaymentLinkEmailEvent event) {
        try {
            emailService.sendTuitionPaymentLinkEmail(
                    event.recipient(),
                    event.payerName(),
                    event.invoiceCode(),
                    event.courseTitle(),
                    event.amount(),
                    event.dueAt(),
                    event.paymentLink());
            log.info("[PaymentLink] Đã gửi email link thanh toán {} tới {}",
                    event.invoiceCode(), event.recipient());
        } catch (Exception ex) {
            // Email lỗi không được ảnh hưởng tới hóa đơn đã tạo; nhân viên vẫn có link để gửi tay.
            log.warn("[PaymentLink] Gửi email link thanh toán {} tới {} thất bại: {}",
                    event.invoiceCode(), event.recipient(), ex.getMessage());
        }
    }
}
