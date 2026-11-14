package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.service.EnrollmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class OfflineEnrollmentOnPaymentListener {
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentService enrollmentService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void createOfflineEnrollmentWhenPaid(InvoicePaidEvent event) {
        Invoice invoice = invoiceRepository.findById(event.invoiceId()).orElse(null);
        if (invoice == null || invoice.getType() != InvoiceType.TUITION_PAYMENT
                || invoice.getStatus() != InvoiceStatus.PAID) return;

        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        if (course == null || course.getCourseType() != CourseType.OFFLINE) return;

        try {
            enrollmentService.createOfflineAfterPayment(invoice.getId());
        } catch (Exception ex) {
            // Payment is already committed; the paid invoice remains visible in the admin retry queue.
            log.error("Không thể tự động ghi danh OFFLINE từ hóa đơn {}: {}",
                    invoice.getInvoiceCode(), ex.getMessage(), ex);
        }
    }
}
