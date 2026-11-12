package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.dto.request.tuition.OnlineCheckoutRequest;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TuitionServiceImplOnlineCheckoutTest {
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

    private final Course course = new Course();

    @BeforeEach
    void setUp() {
        course.setId(34L);
        course.setCourseType(CourseType.ONLINE);
        course.setStatus(CourseStatus.PUBLISHED);
        course.setIsFree(false);
        course.setPrice(new BigDecimal("500000.00"));
        course.setTitle("Online course");
        when(courseRepository.findById(34L)).thenReturn(Optional.of(course));
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void guestCheckoutWithExistingAccountEmailRequiresLogin() {
        when(accountRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(new Account()));

        ErrorHandler error = assertThrows(ErrorHandler.class,
                () -> service.createPublicOnlineCheckout(34L, request("  Buyer@Example.com  ")));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("CHECKOUT_ACCOUNT_EXISTS", error.getCode());
        verify(accountRepository).findByEmail("buyer@example.com");
        verify(invoiceRepository, never()).save(any(Invoice.class));
        verify(leadRepository, never()).save(any());
    }

    @Test
    void loggedInCheckoutKeepsCurrentAccountWhenPayerEmailBelongsToAnotherAccount() {
        Account current = new Account();
        Role role = new Role();
        role.setCode("STUDENT");
        current.setId(91L);
        current.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(current, "", current.getAuthorities()));

        Student student = new Student();
        student.setId(77L);
        student.setUserId(91L);
        when(studentRepository.findByUserId(91L)).thenReturn(Optional.of(student));
        when(enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                34L, 77L, EnrollmentStatus.TERMINATED)).thenReturn(false);
        when(invoiceRepository.findFirstByStudentIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
                77L, 34L, InvoiceType.TUITION_PAYMENT, InvoiceStatus.PENDING)).thenReturn(Optional.empty());
        when(invoiceRepository.findFirstByStudentIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
                77L, 34L, InvoiceType.TUITION_PAYMENT, InvoiceStatus.OVERDUE)).thenReturn(Optional.empty());
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(56L);
            return invoice;
        });

        service.createPublicOnlineCheckout(34L, request("other@example.com"));

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        Invoice invoice = captor.getValue();
        assertEquals(91L, invoice.getCreatedBy());
        assertEquals(77L, invoice.getStudentId());
        assertEquals("other@example.com", invoice.getPayerEmail());
        verify(accountRepository, never()).findByEmail(anyString());
    }

    private OnlineCheckoutRequest request(String email) {
        OnlineCheckoutRequest request = new OnlineCheckoutRequest();
        request.setPayerName("Nguyen Van A");
        request.setPayerEmail(email);
        request.setPayerPhone("0900000000");
        return request;
    }
}
