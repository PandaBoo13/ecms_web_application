package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.service.EnrollmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/** Retries paid ONLINE invoices whose enrollment transaction previously failed. */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaidOnlineEnrollmentReconciliationJob {
    private static final int BATCH_SIZE = 50;

    private final InvoiceRepository invoiceRepository;
    private final EnrollmentService enrollmentService;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(fixedDelayString = "${app.tuition.online-enrollment-retry-delay-ms:60000}")
    public void retryPaidInvoicesWithoutEnrollment() {
        Long afterId = 0L;
        while (true) {
            List<Invoice> pending = invoiceRepository.findPaidOnlineInvoicesWithoutEnrollmentAfterId(
                    InvoiceType.TUITION_PAYMENT,
                    InvoiceStatus.PAID,
                    CourseType.ONLINE,
                    afterId,
                    PageRequest.of(0, BATCH_SIZE));
            if (pending.isEmpty()) return;

            for (Invoice invoice : pending) {
                afterId = invoice.getId();
                try {
                    enrollmentService.createOnlineFromPaidInvoice(invoice.getId());
                    // Re-run paid-invoice notifications only after enrollment and account provisioning commit.
                    eventPublisher.publishEvent(new InvoicePaidEvent(invoice.getId()));
                    log.info("Đã tự động hoàn tất ghi danh ONLINE cho hóa đơn thanh toán {}",
                            invoice.getInvoiceCode());
                } catch (Exception ex) {
                    log.error("Chưa thể tự động ghi danh lại cho hóa đơn {}: {}",
                            invoice.getInvoiceCode(), ex.getMessage(), ex);
                }
            }
        }
    }
}
