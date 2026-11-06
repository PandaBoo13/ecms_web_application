package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromLeadRequest;
import com.ecms_web_application.OC01.dto.response.tuition.CreateInvoiceFromLeadResponse;
import com.ecms_web_application.OC01.dto.response.tuition.PaymentLinkResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TuitionServiceImplCreateInvoiceFromLeadTest {
    @Mock InvoiceRepository invoiceRepository;
    @Mock CourseRepository courseRepository;
    @Mock StudentRepository studentRepository;
    @Mock LeadRepository leadRepository;
    @Mock AccountRepository accountRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock TuitionPaymentLinkService paymentLinkService;
    @InjectMocks TuitionServiceImpl service;

    private final Account admin = new Account();
    private final Lead lead = new Lead();
    private final Course course = new Course();

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setCode("ADMIN");
        admin.setId(91L);
        admin.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, "", admin.getAuthorities()));

        lead.setId(12L);
        lead.setStatus("CONSULTED");
        lead.setCourseId(34L);
        lead.setEmail("lead@example.com");
        lead.setFullName("Test Lead");
        lead.setPhone("0900000000");

        course.setId(34L);
        course.setCourseType(CourseType.OFFLINE);
        course.setPrice(new BigDecimal("1250000.00"));
        course.setTitle("Offline course");

        when(leadRepository.findById(12L)).thenReturn(Optional.of(lead));
        when(courseRepository.findById(34L)).thenReturn(Optional.of(course));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(56L);
            return invoice;
        });
    }

    @AfterEach
    void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test
    void cashCreatesPaidInvoiceWithProofAndPublishesEnrollmentEvent() {
        allowInvoiceCreation();
        CreateInvoiceFromLeadRequest request = request(PaymentMethod.CASH);
        request.setProofUrl("  /uploads/cash-proof.jpg  ");

        CreateInvoiceFromLeadResponse response = service.createInvoiceFromLead(request);

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        Invoice invoice = captor.getValue();
        assertEquals(InvoiceType.TUITION_PAYMENT, invoice.getType());
        assertEquals(InvoiceStatus.PAID, invoice.getStatus());
        assertEquals(PaymentMethod.CASH, invoice.getPaymentMethod());
        assertEquals("/uploads/cash-proof.jpg", invoice.getPaymentProofUrl());
        assertEquals(91L, invoice.getCreatedBy());
        assertEquals(91L, invoice.getConfirmedBy());
        assertEquals(12L, invoice.getLeadId());
        assertEquals(34L, invoice.getCourseId());
        assertEquals(new BigDecimal("1250000.00"), invoice.getAmount());
        assertNotNull(invoice.getPaidAt());
        assertNull(invoice.getDueAt());
        assertNull(response.paymentLink());
        assertEquals(InvoiceStatus.PAID, response.invoice().status());
        verify(eventPublisher).publishEvent(argThat((Object event) -> event instanceof InvoicePaidEvent paid
                && paid.invoiceId().equals(56L)));
        verifyNoInteractions(paymentLinkService);
    }

    @Test
    void bankTransferCreatesPendingInvoiceAndReturnsPaymentLinkWithoutPaidEvent() {
        PaymentLinkResponse link = new PaymentLinkResponse("https://pay.example/link", "other@example.com",
                LocalDateTime.now().plusHours(24), true, null);
        allowInvoiceCreation();
        when(paymentLinkService.sendPaymentLink(56L, "  other@example.com ")).thenReturn(link);
        CreateInvoiceFromLeadRequest request = request(PaymentMethod.BANK_TRANSFER);
        request.setEmail("  other@example.com ");
        LocalDateTime before = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

        CreateInvoiceFromLeadResponse response = service.createInvoiceFromLead(request);

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        Invoice invoice = captor.getValue();
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());
        assertEquals(PaymentMethod.BANK_TRANSFER, invoice.getPaymentMethod());
        assertEquals(12L, invoice.getLeadId());
        assertEquals(34L, invoice.getCourseId());
        assertEquals(91L, invoice.getCreatedBy());
        assertNull(invoice.getPaidAt());
        assertNull(invoice.getPaymentProofUrl());
        assertFalse(invoice.getDueAt().isBefore(before.plusHours(24)));
        assertTrue(invoice.getDueAt().isBefore(LocalDateTime.now().plusHours(24).plusSeconds(2)));
        assertEquals(link, response.paymentLink());
        assertEquals(InvoiceStatus.PENDING, response.invoice().status());
        verify(paymentLinkService).sendPaymentLink(56L, "  other@example.com ");
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void cashRequiresProofAndDoesNotSaveInvoice() {
        CreateInvoiceFromLeadRequest request = request(PaymentMethod.CASH);

        assertThrows(RuntimeException.class, () -> service.createInvoiceFromLead(request));

        verify(invoiceRepository, never()).save(any());
        verifyNoInteractions(eventPublisher, paymentLinkService);
    }

    private CreateInvoiceFromLeadRequest request(PaymentMethod method) {
        CreateInvoiceFromLeadRequest request = new CreateInvoiceFromLeadRequest();
        request.setLeadId(12L);
        request.setPaymentMethod(method);
        return request;
    }

    private void allowInvoiceCreation() {
        when(invoiceRepository.existsByLeadIdAndCourseIdAndTypeAndStatusIn(
                eq(12L), eq(34L), eq(InvoiceType.TUITION_PAYMENT), anyList())).thenReturn(false);
    }
}
