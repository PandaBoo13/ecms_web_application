package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaidTuitionInvoiceEmailListener {
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final AccountRepository accountRepository;
    private final StudentRepository studentRepository;
    private final LeadRepository leadRepository;
    private final EmailService emailService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendPaidInvoiceEmail(InvoicePaidEvent event) {
        Invoice invoice = invoiceRepository.findById(event.invoiceId()).orElse(null);
        if (invoice == null || invoice.getType() != InvoiceType.TUITION_PAYMENT
                || invoice.getStatus() != InvoiceStatus.PAID) {
            return;
        }

        Recipient recipient = resolveRecipient(invoice);
        if (recipient == null || recipient.email() == null || recipient.email().isBlank()) {
            log.warn("Không gửi được hóa đơn {} qua email: không tìm thấy email người thanh toán",
                    invoice.getInvoiceCode());
            return;
        }

        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        String courseName = course != null ? course.getTitle() : "Khóa học #" + invoice.getCourseId();
        String courseCode = course != null ? course.getCode() : null;
        String method = invoice.getPaymentMethod() == PaymentMethod.CASH ? "Tiền mặt"
                : invoice.getPaymentMethod() == PaymentMethod.BANK_TRANSFER ? "Chuyển khoản" : "";

        try {
            emailService.sendTuitionPaidInvoiceEmail(recipient.email(), recipient.name(), recipient.phone(),
                    invoice.getInvoiceCode(), invoice.getCreatedAt(), courseCode, courseName,
                    invoice.getPaidAt(), invoice.getAmount(), method,
                    invoice.getTransactionReference());
        } catch (Exception ex) {
            // Email failure must not roll back or invalidate an already successful payment.
            log.warn("Gửi hóa đơn thanh toán {} đến {} thất bại: {}",
                    invoice.getInvoiceCode(), recipient.email(), ex.getMessage());
        }
    }

    private Recipient resolveRecipient(Invoice invoice) {
        if (invoice.getPayerEmail() != null && !invoice.getPayerEmail().isBlank()) {
            return new Recipient(invoice.getPayerEmail(), invoice.getPayerName(), invoice.getPayerPhone());
        }
        if (invoice.getAccountId() != null) {
            return accountRepository.findById(invoice.getAccountId())
                    .map(account -> new Recipient(account.getEmail(), account.getUserProfile() != null
                            ? account.getUserProfile().getFullName() : "Bạn",
                            account.getUserProfile() != null ? account.getUserProfile().getPhone() : null))
                    .orElse(null);
        }
        if (invoice.getStudentId() != null) {
            return studentRepository.findById(invoice.getStudentId())
                    .map(student -> new Recipient(student.getEmail(), student.getFullName(), student.getPhone()))
                    .orElse(null);
        }
        if (invoice.getLeadId() != null) {
            return leadRepository.findById(invoice.getLeadId())
                    .map(lead -> new Recipient(lead.getEmail(), lead.getFullName(), lead.getPhone()))
                    .orElse(null);
        }
        return null;
    }

    private record Recipient(String email, String name, String phone) { }
}
