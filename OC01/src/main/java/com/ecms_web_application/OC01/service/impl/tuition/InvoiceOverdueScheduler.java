package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceOverdueScheduler {
    private final InvoiceRepository invoiceRepository;

    @Scheduled(cron = "0 0 1 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void markOfflineInvoicesOverdue() {
        int updated = 0;
        for (Invoice invoice : invoiceRepository.findDueInvoicesForUpdate(
                InvoiceType.TUITION_PAYMENT, InvoiceStatus.PENDING, LocalDateTime.now(), CourseType.OFFLINE)) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
            updated++;
        }
        if (updated > 0) log.info("Marked {} offline tuition invoices OVERDUE", updated);
    }
}
