package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.dto.request.tuition.RefundInvoiceRequest;
import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.event.InvoiceRefundedEvent;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.EnrollmentService;
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
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TuitionServiceImplRefundTest {
    @Mock InvoiceRepository invoiceRepository;
    @Mock CourseRepository courseRepository;
    @Mock StudentRepository studentRepository;
    @Mock LeadRepository leadRepository;
    @Mock AccountRepository accountRepository;
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock EnrollmentService enrollmentService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock TuitionPaymentLinkService paymentLinkService;
    @Mock AuditLogService auditLogService;
    @InjectMocks TuitionServiceImpl service;

    private final Account admin = new Account();
    private final Invoice original = new Invoice();
    private final Course course = new Course();

    @BeforeEach
    void setUp() {
        Role role = new Role();
        role.setCode("ADMIN");
        admin.setId(91L);
        admin.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, "", admin.getAuthorities()));

        original.setId(10L);
        original.setInvoiceCode("INV-ORIGINAL");
        original.setType(InvoiceType.TUITION_PAYMENT);
        original.setStatus(InvoiceStatus.PAID);
        original.setAmount(new BigDecimal("1250000.00"));
        original.setStudentId(12L);
        original.setCourseId(34L);

        course.setId(34L);
        course.setTitle("Offline course");
        course.setCourseType(CourseType.OFFLINE);

        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(original));
        lenient().when(courseRepository.findById(34L)).thenReturn(Optional.of(course));
    }

    @AfterEach
    void clearSecurity() { SecurityContextHolder.clearContext(); }

    @Test
    void createsPaidRefundWithRecipientSnapshotAndPublishesEvent() {
        LocalDateTime refundedAt = LocalDateTime.now().minusDays(1).truncatedTo(ChronoUnit.SECONDS);
        stubRefundResponse();
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(99L);
            return invoice;
        });

        InvoiceResponse response = service.refund(10L, request(refundedAt));

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        Invoice refund = captor.getValue();
        assertEquals(InvoiceType.REFUND, refund.getType());
        assertEquals(InvoiceStatus.PAID, refund.getStatus());
        assertEquals(10L, refund.getOriginalInvoiceId());
        assertEquals(12L, refund.getStudentId());
        assertEquals(34L, refund.getCourseId());
        assertEquals(new BigDecimal("1250000.00"), refund.getAmount());
        assertEquals(PaymentMethod.BANK_TRANSFER, refund.getPaymentMethod());
        assertEquals("BANK-REF-001", refund.getTransactionReference());
        assertEquals("Nguyen Van A", refund.getPayerName());
        assertEquals("refund@example.com", refund.getPayerEmail());
        assertEquals("0900000000", refund.getPayerPhone());
        assertEquals(refundedAt, refund.getPaidAt());
        assertEquals("Học viên xin nghỉ", refund.getReason());
        assertEquals("/uploads/refund-proof.jpg", refund.getPaymentProofUrl());
        assertEquals(91L, refund.getConfirmedBy());
        assertEquals(91L, refund.getCreatedBy());

        assertEquals("INV-ORIGINAL", response.originalInvoiceCode());
        assertEquals("Nguyen Van A", response.ownerName());
        assertEquals("refund@example.com", response.ownerEmail());

        verify(auditLogService).log(eq("REFUND"), eq("Invoice"), eq(99L), any(String.class));
        verify(enrollmentService).terminateForFullRefund(eq(10L), eq(91L), any(String.class));
        verify(eventPublisher).publishEvent(argThat((Object event) ->
                event instanceof InvoiceRefundedEvent refunded && refunded.refundInvoiceId().equals(99L)));
    }

    @Test
    void rejectsRefundForOnlineCourse() {
        course.setCourseType(CourseType.ONLINE);

        ErrorHandler error = assertThrows(ErrorHandler.class,
                () -> service.refund(10L, request(null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(invoiceRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void keepsEnrollmentWhenRefundIsPartial() {
        stubRefundResponse();
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(99L);
            return invoice;
        });
        RefundInvoiceRequest request = request(null);
        request.setAmount(new BigDecimal("500000.00"));

        service.refund(10L, request);

        verify(enrollmentService, never()).terminateForFullRefund(any(), any(), any());
    }

    @Test
    void usesCurrentTimeWhenRefundedAtIsMissing() {
        stubRefundResponse();
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(99L);
            return invoice;
        });
        LocalDateTime before = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

        service.refund(10L, request(null));

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        assertNotNull(captor.getValue().getPaidAt());
        assertTrue(!captor.getValue().getPaidAt().isBefore(before));
    }

    @Test
    void rejectsRefundWhenOriginalInvoiceAlreadyHasRefund() {
        when(invoiceRepository.existsByOriginalInvoiceId(10L)).thenReturn(true);

        ErrorHandler error = assertThrows(ErrorHandler.class,
                () -> service.refund(10L, request(null)));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(invoiceRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void rejectsRefundAmountGreaterThanOriginalAmount() {
        RefundInvoiceRequest request = request(null);
        request.setAmount(new BigDecimal("1250000.01"));

        ErrorHandler error = assertThrows(ErrorHandler.class,
                () -> service.refund(10L, request));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void rejectsRefundWhenOriginalInvoiceIsNotPaid() {
        original.setStatus(InvoiceStatus.PENDING);

        ErrorHandler error = assertThrows(ErrorHandler.class,
                () -> service.refund(10L, request(null)));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void trimsOptionalFieldsToNullWhenBlank() {
        stubRefundResponse();
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            invoice.setId(99L);
            return invoice;
        });
        RefundInvoiceRequest request = request(null);
        request.setTransactionReference("   ");
        request.setPayerPhone("   ");

        service.refund(10L, request);

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        verify(invoiceRepository).save(captor.capture());
        assertNull(captor.getValue().getTransactionReference());
        assertNull(captor.getValue().getPayerPhone());
    }

    private void stubRefundResponse() {
        when(invoiceRepository.findAllById(anyIterable())).thenReturn(List.of(original));
        when(courseRepository.findAllById(anyIterable())).thenReturn(List.of(course));
    }

    private RefundInvoiceRequest request(LocalDateTime refundedAt) {
        RefundInvoiceRequest request = new RefundInvoiceRequest();
        request.setAmount(new BigDecimal("1250000.00"));
        request.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        request.setTransactionReference("  BANK-REF-001  ");
        request.setReason("  Học viên xin nghỉ  ");
        request.setProofUrl("  /uploads/refund-proof.jpg  ");
        request.setPayerName("  Nguyen Van A  ");
        request.setPayerEmail("  refund@example.com  ");
        request.setPayerPhone("  0900000000  ");
        request.setRefundedAt(refundedAt);
        return request;
    }
}
