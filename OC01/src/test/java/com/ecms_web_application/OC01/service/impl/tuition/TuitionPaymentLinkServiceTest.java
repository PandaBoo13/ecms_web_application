package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.config.JwtService;
import com.ecms_web_application.OC01.dto.response.tuition.PaymentLinkResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.event.TuitionPaymentLinkEmailEvent;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.EmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TuitionPaymentLinkServiceTest {
    @Mock InvoiceRepository invoiceRepository;
    @Mock CourseRepository courseRepository;
    @Mock LeadRepository leadRepository;
    @Mock StudentRepository studentRepository;
    @Mock AccountRepository accountRepository;
    @Mock JwtService jwtService;
    @Mock EmailService emailService;
    @Mock VnpayGatewayService vnpayGatewayService;
    @Mock AuditLogService auditLogService;
    @Mock ApplicationEventPublisher eventPublisher;
    @InjectMocks TuitionPaymentLinkService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "apiUrl", "http://api.test");
        Role role = new Role();
        role.setCode("ADMIN");
        Account admin = new Account();
        admin.setId(91L);
        admin.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, "", admin.getAuthorities()));
    }

    @AfterEach
    void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test
    void queuePaymentLinkPublishesEmailEventWithoutCallingSmtp() {
        Invoice invoice = new Invoice();
        invoice.setId(5L);
        invoice.setInvoiceCode("INV-1");
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCourseId(7L);
        invoice.setLeadId(9L);
        invoice.setAmount(new BigDecimal("100000"));
        invoice.setDueAt(LocalDateTime.now().plusHours(24));

        Lead lead = new Lead();
        lead.setId(9L);
        lead.setFullName("Test Lead");
        lead.setEmail("lead@example.com");

        Course course = new Course();
        course.setId(7L);
        course.setTitle("Course");

        when(invoiceRepository.findById(5L)).thenReturn(Optional.of(invoice));
        when(leadRepository.findById(9L)).thenReturn(Optional.of(lead));
        when(courseRepository.findById(7L)).thenReturn(Optional.of(course));
        when(jwtService.generateLinkToken(anyMap(), eq("invoice:5"), anyLong())).thenReturn("token");

        PaymentLinkResponse response = service.queuePaymentLink(5L, null);

        // SMTP không được gọi trên thread request; email chỉ được xếp hàng sau commit.
        verifyNoInteractions(emailService);

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(captor.capture());
        TuitionPaymentLinkEmailEvent event = assertInstanceOf(TuitionPaymentLinkEmailEvent.class, captor.getValue());
        assertEquals("lead@example.com", event.recipient());
        assertEquals("INV-1", event.invoiceCode());
        assertEquals("Course", event.courseTitle());
        assertTrue(response.emailSent());
        assertTrue(response.paymentLink().contains("token"));
        verify(auditLogService).log(eq("SEND_PAYMENT_LINK"), eq("Invoice"), eq(5L), contains("INV-1"));
    }
}
