package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.event.InvoiceRefundedEvent;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Gửi email xác nhận sau khi chứng từ hoàn tiền được ghi nhận.
 * Lỗi email không được làm rollback nghiệp vụ hoàn tiền.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RefundInvoiceEmailListener {
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final EmailService emailService;

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void sendRefundEmail(InvoiceRefundedEvent event) {
        Invoice refund = invoiceRepository.findById(event.refundInvoiceId()).orElse(null);
        if (refund == null || refund.getType() != InvoiceType.REFUND
                || refund.getStatus() != InvoiceStatus.PAID) {
            return;
        }

        String email = refund.getPayerEmail();
        if (email == null || email.isBlank()) {
            log.warn("Không gửi được xác nhận hoàn tiền {}: chứng từ thiếu email người nhận",
                    refund.getInvoiceCode());
            return;
        }

        Invoice original = refund.getOriginalInvoiceId() == null ? null
                : invoiceRepository.findById(refund.getOriginalInvoiceId()).orElse(null);
        Course course = refund.getCourseId() == null ? null
                : courseRepository.findById(refund.getCourseId()).orElse(null);
        String method = refund.getPaymentMethod() == PaymentMethod.CASH ? "Tiền mặt"
                : refund.getPaymentMethod() == PaymentMethod.BANK_TRANSFER ? "Chuyển khoản" : "";

        try {
            emailService.sendTuitionRefundEmail(
                    email,
                    refund.getPayerName(),
                    refund.getInvoiceCode(),
                    original == null ? null : original.getInvoiceCode(),
                    course == null ? null : course.getTitle(),
                    refund.getPaidAt(),
                    refund.getAmount(),
                    method,
                    refund.getTransactionReference(),
                    refund.getReason());
        } catch (Exception ex) {
            log.warn("Gửi xác nhận hoàn tiền {} đến {} thất bại: {}",
                    refund.getInvoiceCode(), email, ex.getMessage());
        }
    }
}
