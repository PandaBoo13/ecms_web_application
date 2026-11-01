package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.entity.Course;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.EnrollmentService;
import com.ecms_web_application.OC01.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OnlineEnrollmentOnPaymentListener {
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentService enrollmentService;
    private final NotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void createEnrollmentWhenPaid(InvoicePaidEvent event) {
        Invoice invoice = invoiceRepository.findById(event.invoiceId()).orElse(null);
        if (invoice == null || invoice.getType() != InvoiceType.TUITION_PAYMENT
                || invoice.getStatus() != InvoiceStatus.PAID) return;
        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        if (course != null && course.getCourseType() == CourseType.ONLINE) {
            enrollmentService.createOnlineFromPaidInvoice(invoice.getId());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notifyWhenPaid(InvoicePaidEvent event) {
        Invoice invoice = invoiceRepository.findById(event.invoiceId()).orElse(null);
        if (invoice == null || invoice.getType() != InvoiceType.TUITION_PAYMENT
                || invoice.getStatus() != InvoiceStatus.PAID) return;
        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        sendPaymentNotification(invoice, course);
    }

    private void sendPaymentNotification(Invoice invoice, Course course) {
        try {
            Long recipientAccountId = invoice.getAccountId();
            if (recipientAccountId == null && invoice.getStudentId() != null) {
                recipientAccountId = studentRepository.findById(invoice.getStudentId())
                        .map(Student::getUserId).orElse(null);
            }
            if (recipientAccountId == null) return;

            String courseName = course != null ? course.getTitle() : "Khóa học #" + invoice.getCourseId();
            NotificationRequest request = NotificationRequest.builder()
                    .notificationType("ORDER")
                    .title("Thanh toán học phí thành công")
                    .content("Hóa đơn " + invoice.getInvoiceCode() + " cho khóa học '" + courseName + "' ("
                            + String.format("%,.0f đ", invoice.getAmount()) + ") đã thanh toán thành công.")
                    .referenceType("invoice")
                    .referenceId(invoice.getId())
                    .receiverAccountIds(List.of(recipientAccountId))
                    .priority("HIGH")
                    .build();
            notificationService.sendNotification(request);
        } catch (Exception ex) {
            log.warn("Không gửi được notification thanh toán: {}", ex.getMessage());
        }
    }
}
