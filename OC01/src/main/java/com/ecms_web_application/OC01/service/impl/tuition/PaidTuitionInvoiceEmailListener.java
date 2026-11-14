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
import com.ecms_web_application.OC01.service.impl.TemporaryCredentialStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(3)
public class PaidTuitionInvoiceEmailListener {
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final AccountRepository accountRepository;
    private final StudentRepository studentRepository;
    private final LeadRepository leadRepository;
    private final PaidInvoiceEmailDispatcher emailDispatcher;
    private final TemporaryCredentialStore temporaryCredentialStore;

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
            // Only present when payment-time provisioning created a new student account.
            String loginEmail = resolveLoginEmail(invoice, recipient.email());
            String temporaryPassword = temporaryCredentialStore.peek(loginEmail);
            if (temporaryPassword != null && accountRepository.findByEmail(
                    loginEmail.trim().toLowerCase(java.util.Locale.ROOT)).isEmpty()) {
                // A payment listener can fail after account creation was rolled back. Never email
                // a password that does not belong to a persisted account.
                temporaryCredentialStore.consume(loginEmail);
                temporaryPassword = null;
                log.warn("Bỏ thông tin đăng nhập của hóa đơn {} vì tài khoản {} chưa được lưu",
                        invoice.getInvoiceCode(), loginEmail);
            }
            emailDispatcher.send(new PaidInvoiceEmailDispatcher.Payload(
                    recipient.email(), recipient.name(), recipient.phone(),
                    invoice.getInvoiceCode(), invoice.getCreatedAt(), courseCode, courseName,
                    invoice.getPaidAt(), invoice.getAmount(), method,
                    invoice.getTransactionReference(), loginEmail, temporaryPassword));
            // Mật khẩu tạm được consume bởi dispatcher sau khi SMTP gửi thành công,
            // tránh trường hợp gửi mail lỗi làm mất thông tin đăng nhập.
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

    private String resolveLoginEmail(Invoice invoice, String fallbackEmail) {
        if (invoice.getStudentId() != null) {
            Student student = studentRepository.findById(invoice.getStudentId()).orElse(null);
            if (student != null) {
                if (student.getUserId() != null) {
                    Account account = accountRepository.findById(student.getUserId()).orElse(null);
                    if (account != null && account.getEmail() != null && !account.getEmail().isBlank()) {
                        return account.getEmail();
                    }
                }
                if (student.getEmail() != null && !student.getEmail().isBlank()) {
                    return student.getEmail();
                }
            }
        }
        if (invoice.getLeadId() != null) {
            Lead lead = leadRepository.findById(invoice.getLeadId()).orElse(null);
            if (lead != null && lead.getEmail() != null && !lead.getEmail().isBlank()) {
                return lead.getEmail();
            }
        }
        return fallbackEmail;
    }

    private record Recipient(String email, String name, String phone) { }
}
