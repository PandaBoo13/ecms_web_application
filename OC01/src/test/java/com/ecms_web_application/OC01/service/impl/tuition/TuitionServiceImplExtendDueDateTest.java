package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.dto.request.tuition.ExtendInvoiceDueDateRequest;
import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TuitionServiceImplExtendDueDateTest {
    @Mock InvoiceRepository invoiceRepository;
    @Mock CourseRepository courseRepository;
    @Mock StudentRepository studentRepository;
    @Mock LeadRepository leadRepository;
    @Mock AccountRepository accountRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock TuitionPaymentLinkService paymentLinkService;
    @Mock AuditLogService auditLogService;
    @InjectMocks TuitionServiceImpl service;

    @BeforeEach
    void loginAsAdmin() {
        Role role = new Role();
        role.setCode("ADMIN");
        Account admin = new Account();
        admin.setId(91L);
        admin.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, "", admin.getAuthorities()));
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void extendAcceptsExpiredPendingInvoiceWithoutWaitingForScheduler() {
        Invoice invoice = offlineInvoice(InvoiceStatus.PENDING, LocalDateTime.now().minusHours(2));
        LocalDateTime newDueAt = LocalDateTime.now().plusDays(3);
        when(invoiceRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(invoice));
        when(courseRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(offlineCourse()));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = service.extendDueDate(5L, request(newDueAt));

        assertEquals(InvoiceStatus.PENDING, response.status());
        assertEquals(newDueAt, response.dueAt());
    }

    @Test
    void extendAcceptsPersistedOverdueInvoice() {
        Invoice invoice = offlineInvoice(InvoiceStatus.OVERDUE, LocalDateTime.now().minusDays(1));
        LocalDateTime newDueAt = LocalDateTime.now().plusDays(3);
        when(invoiceRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(invoice));
        when(courseRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(offlineCourse()));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = service.extendDueDate(5L, request(newDueAt));

        assertEquals(InvoiceStatus.PENDING, response.status());
        assertEquals(newDueAt, response.dueAt());
    }

    @Test
    void extendRejectsInvoiceStillWithinDeadline() {
        Invoice invoice = offlineInvoice(InvoiceStatus.PENDING, LocalDateTime.now().plusHours(6));
        when(invoiceRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(invoice));

        ErrorHandler error = assertThrows(ErrorHandler.class,
                () -> service.extendDueDate(5L, request(LocalDateTime.now().plusDays(3))));

        assertEquals(409, error.getStatus().value());
    }

    private Invoice offlineInvoice(InvoiceStatus status, LocalDateTime dueAt) {
        Invoice invoice = new Invoice();
        invoice.setId(5L);
        invoice.setInvoiceCode("INV-5");
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setStatus(status);
        invoice.setCourseId(7L);
        invoice.setAmount(new BigDecimal("100000"));
        invoice.setDueAt(dueAt);
        return invoice;
    }

    private Course offlineCourse() {
        Course course = new Course();
        course.setId(7L);
        course.setCourseType(CourseType.OFFLINE);
        course.setMaxStudents(null);
        return course;
    }

    private ExtendInvoiceDueDateRequest request(LocalDateTime dueAt) {
        ExtendInvoiceDueDateRequest request = new ExtendInvoiceDueDateRequest();
        request.setDueAt(dueAt);
        return request;
    }
}
