package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.dto.response.tuition.TuitionInvoiceStatsResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class TuitionServiceImplSearchTest {
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
    void searchLoadsRelatedDataInBatchInsteadOfPerInvoice() {
        Invoice first = invoice(1L, 34L, 77L);
        Invoice second = invoice(2L, 34L, 88L);
        when(invoiceRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(first, second), PageRequest.of(0, 10), 2));

        Student an = student(77L, "Nguyen Van An", "an@example.com", "0901");
        Student binh = student(88L, "Tran Van Binh", "binh@example.com", "0902");
        when(studentRepository.findAllById(anyIterable())).thenReturn(List.of(an, binh));

        Course course = new Course();
        course.setId(34L);
        course.setTitle("IELTS Foundation");
        course.setCourseType(CourseType.OFFLINE);
        when(courseRepository.findAllById(anyIterable())).thenReturn(List.of(course));

        Page<InvoiceResponse> page = service.search(InvoiceType.TUITION_PAYMENT, null, null, null,
                null, null, null, false, PageRequest.of(0, 10));

        assertEquals(2, page.getContent().size());
        assertEquals("Nguyen Van An", page.getContent().get(0).ownerName());
        assertEquals("an@example.com", page.getContent().get(0).ownerEmail());
        assertEquals("IELTS Foundation", page.getContent().get(0).courseTitle());
        assertEquals("Tran Van Binh", page.getContent().get(1).ownerName());

        // Cả trang chỉ truy vấn 1 lần cho mỗi loại dữ liệu, không truy vấn theo từng dòng hóa đơn.
        verify(studentRepository, times(1)).findAllById(anyIterable());
        verify(courseRepository, times(1)).findAllById(anyIterable());
        verify(studentRepository, never()).findById(anyLong());
        verify(courseRepository, never()).findById(anyLong());
        verify(invoiceRepository, never()).findById(anyLong());
    }

    @Test
    void getStatsAggregatesCountsFromSingleGroupedQuery() {
        when(invoiceRepository.countByTypeGroupedByStatus(
                eq(InvoiceType.TUITION_PAYMENT), isNull()))
                .thenReturn(List.<Object[]>of(
                        new Object[]{InvoiceStatus.PENDING, 4L},
                        new Object[]{InvoiceStatus.PAID, 6L},
                        new Object[]{InvoiceStatus.CANCELLED, 1L}));

        TuitionInvoiceStatsResponse stats = service.getStats();

        assertEquals(11L, stats.total());
        assertEquals(4L, stats.pending());
        assertEquals(6L, stats.paid());
        assertEquals(0L, stats.overdue());
        assertEquals(1L, stats.cancelled());
        verify(invoiceRepository).countByTypeGroupedByStatus(InvoiceType.TUITION_PAYMENT, null);
    }

    @Test
    void getStatsBucketsExpiredPendingIntoOverdue() {
        when(invoiceRepository.countByTypeGroupedByStatus(
                eq(InvoiceType.TUITION_PAYMENT), isNull()))
                .thenReturn(List.<Object[]>of(
                        new Object[]{InvoiceStatus.PENDING, 4L},
                        new Object[]{InvoiceStatus.OVERDUE, 1L},
                        new Object[]{InvoiceStatus.PAID, 6L}));
        when(invoiceRepository.countExpiredPendingTuitionInvoices(
                eq(InvoiceType.TUITION_PAYMENT), eq(InvoiceStatus.PENDING), any(LocalDateTime.class),
                isNull()))
                .thenReturn(2L);

        TuitionInvoiceStatsResponse stats = service.getStats();

        // 4 PENDING gồm 2 hóa đơn đã qua hạn → hiển thị 2 chờ thanh toán, 3 quá hạn.
        assertEquals(11L, stats.total());
        assertEquals(2L, stats.pending());
        assertEquals(3L, stats.overdue());
        assertEquals(6L, stats.paid());
        assertEquals(0L, stats.cancelled());
    }

    @Test
    void searchMarksExpiredPendingInvoiceAsOverdue() {
        Invoice expired = invoice(1L, 34L, 77L);
        expired.setDueAt(LocalDateTime.now().minusHours(2));
        Invoice stillPending = invoice(2L, 34L, 77L);
        stillPending.setDueAt(LocalDateTime.now().plusHours(2));
        when(invoiceRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(expired, stillPending), PageRequest.of(0, 10), 2));
        when(studentRepository.findAllById(anyIterable())).thenReturn(List.of());
        when(courseRepository.findAllById(anyIterable())).thenReturn(List.of());

        Page<InvoiceResponse> page = service.search(InvoiceType.TUITION_PAYMENT, null, null, null,
                null, null, null, false, PageRequest.of(0, 10));

        assertEquals(InvoiceStatus.OVERDUE, page.getContent().get(0).status());
        assertEquals(InvoiceStatus.PENDING, page.getContent().get(1).status());
    }

    private Invoice invoice(Long id, Long courseId, Long studentId) {
        Invoice invoice = new Invoice();
        invoice.setId(id);
        invoice.setInvoiceCode("INV-" + id);
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCourseId(courseId);
        invoice.setStudentId(studentId);
        invoice.setAmount(new BigDecimal("100000"));
        return invoice;
    }

    private Student student(Long id, String fullName, String email, String phone) {
        Student student = new Student();
        student.setId(id);
        student.setFullName(fullName);
        student.setEmail(email);
        student.setPhone(phone);
        return student;
    }
}
