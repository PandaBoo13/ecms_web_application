package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.event.InvoiceExtendedEvent;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceExtendedEmailListener {
    private final InvoiceRepository invoiceRepository;
    private final LeadRepository leadRepository;
    private final CourseRepository courseRepository;
    private final TuitionPaymentLinkService paymentLinkService;
    private final EmailService emailService;

    /** Send only after the extension commits, and keep SMTP off the request thread. */
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendGuestInvoiceExtendedEmail(InvoiceExtendedEvent event) {
        Invoice invoice = invoiceRepository.findById(event.invoiceId()).orElse(null);
        if (invoice == null || invoice.getType() != InvoiceType.TUITION_PAYMENT
                || invoice.getStatus() != InvoiceStatus.PENDING
                || invoice.getStudentId() != null) {
            return;
        }

        Lead lead = invoice.getLeadId() == null
                ? null : leadRepository.findById(invoice.getLeadId()).orElse(null);
        String recipient = firstNonBlank(invoice.getPayerEmail(), lead == null ? null : lead.getEmail());
        if (recipient == null) {
            log.warn("[InvoiceExtension] Không gửi email {}: hóa đơn guest không có email nhận",
                    invoice.getInvoiceCode());
            return;
        }

        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        String courseTitle = course == null ? "Khóa học #" + invoice.getCourseId() : course.getTitle();
        String fullName = firstNonBlank(invoice.getPayerName(), lead == null ? null : lead.getFullName());
        if (fullName == null) fullName = "bạn";

        try {
            String paymentUrl = paymentLinkService.createPaymentRedirectUrl(invoice.getId());
            emailService.sendTuitionInvoiceExtendedEmail(
                    recipient, fullName, invoice.getInvoiceCode(), courseTitle,
                    invoice.getAmount(), invoice.getDueAt(), paymentUrl);
            log.info("[InvoiceExtension] Đã gửi thông báo gia hạn hóa đơn {} tới {}",
                    invoice.getInvoiceCode(), recipient);
        } catch (Exception ex) {
            // A mail/link failure must not undo an extension that is already committed.
            log.warn("[InvoiceExtension] Gửi thông báo hóa đơn {} tới {} thất bại: {}",
                    invoice.getInvoiceCode(), recipient, ex.getMessage());
        }
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) return primary.trim();
        if (fallback != null && !fallback.isBlank()) return fallback.trim();
        return null;
    }
}
