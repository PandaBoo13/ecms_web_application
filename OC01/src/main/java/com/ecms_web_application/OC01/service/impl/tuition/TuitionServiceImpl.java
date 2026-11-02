package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.tuition.CancelInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.ExtendInvoiceDueDateRequest;
import com.ecms_web_application.OC01.dto.request.tuition.RefundInvoiceRequest;
import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.TuitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TuitionServiceImpl implements TuitionService {
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final LeadRepository leadRepository;
    private final AccountRepository accountRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public InvoiceResponse createOfflineInvoice(CreateInvoiceRequest request) {
        requireAdmin();
        Course course = getCourse(request.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ tạo hóa đơn thủ công cho khóa OFFLINE");
        }
        validateOwnerReferences(request.getAccountId(), request.getStudentId(), request.getLeadId());
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Số tiền hóa đơn phải lớn hơn 0");
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setCourseId(course.getId());
        invoice.setStudentId(request.getStudentId());
        invoice.setAccountId(request.getAccountId());
        invoice.setLeadId(request.getLeadId());
        invoice.setAmount(request.getAmount());
        invoice.setDueAt(request.getDueAt());
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCreatedBy(SecurityUtils.requireCurrentAccountId());
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceResponse createOnlineCheckoutInvoice(Long courseId) {
        if (!SecurityUtils.hasRole("ADMIN") && !SecurityUtils.hasRole("STUDENT")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ học viên mới được tạo hóa đơn checkout");
        }
        Long accountId = SecurityUtils.requireCurrentAccountId();
        Course course = getCourse(courseId);
        if (course.getCourseType() != CourseType.ONLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Checkout này chỉ áp dụng cho khóa ONLINE");
        }
        if (Boolean.TRUE.equals(course.getIsFree()) || course.getPrice() == null
                || course.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Khóa học miễn phí không cần tạo hóa đơn");
        }

        Invoice pending = invoiceRepository.findFirstByAccountIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
                accountId, courseId, InvoiceType.TUITION_PAYMENT, InvoiceStatus.PENDING).orElse(null);
        if (pending != null) return InvoiceResponse.from(pending);

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setCourseId(course.getId());
        invoice.setAccountId(accountId);
        invoice.setAmount(course.getPrice());
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCreatedBy(accountId);
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> search(InvoiceType type, InvoiceStatus status, Long courseId,
                                        Long studentId, Long accountId, Long leadId, Pageable pageable) {
        Long ownerAccountId = null;
        Long ownerStudentId = null;
        if (!SecurityUtils.hasRole("ADMIN")) {
            Long currentAccountId = SecurityUtils.requireCurrentAccountId();
            ownerAccountId = currentAccountId;
            ownerStudentId = studentRepository.findByUserId(currentAccountId).map(s -> s.getId()).orElse(-1L);
        }
        return invoiceRepository.search(type, status, courseId, studentId, accountId, leadId,
                        ownerAccountId, ownerStudentId, pageable)
                .map(InvoiceResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getById(Long invoiceId) {
        Invoice invoice = getInvoice(invoiceId);
        requireCanView(invoice);
        return InvoiceResponse.from(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse confirmCashPayment(Long invoiceId) {
        requireAdmin();
        Invoice invoice = getInvoice(invoiceId);
        requireTuitionInvoice(invoice);
        requirePayable(invoice);
        Course course = getCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ xác nhận tiền mặt cho khóa OFFLINE");
        }
        if (invoice.getStatus() == InvoiceStatus.OVERDUE && course.getMaxStudents() != null
                && course.getCurrentStudents() >= course.getMaxStudents()) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa học đã đủ sĩ số; không thể thu hóa đơn quá hạn");
        }

        invoice.setPaymentMethod(PaymentMethod.CASH);
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoice.setConfirmedBy(SecurityUtils.requireCurrentAccountId());
        Invoice saved = invoiceRepository.save(invoice);
        eventPublisher.publishEvent(new InvoicePaidEvent(saved.getId()));
        return InvoiceResponse.from(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse extendDueDate(Long invoiceId, ExtendInvoiceDueDateRequest request) {
        requireAdmin();
        Invoice invoice = getInvoice(invoiceId);
        requireTuitionInvoice(invoice);
        if (invoice.getStatus() != InvoiceStatus.OVERDUE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ gia hạn được hóa đơn OVERDUE");
        }
        Course course = getCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE || request.getDueAt() == null
                || !request.getDueAt().isAfter(LocalDateTime.now())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Hạn thanh toán mới không hợp lệ");
        }
        if (course.getMaxStudents() != null && course.getCurrentStudents() >= course.getMaxStudents()) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa học đã đủ sĩ số; không thể gia hạn hóa đơn");
        }
        invoice.setDueAt(request.getDueAt());
        invoice.setStatus(InvoiceStatus.PENDING);
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceResponse cancel(Long invoiceId, CancelInvoiceRequest request) {
        requireAdmin();
        Invoice invoice = getInvoice(invoiceId);
        requireTuitionInvoice(invoice);
        if (invoice.getStatus() != InvoiceStatus.PENDING && invoice.getStatus() != InvoiceStatus.OVERDUE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ hủy hóa đơn PENDING hoặc OVERDUE");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setReason(request.getReason().trim());
        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceResponse refund(Long invoiceId, RefundInvoiceRequest request) {
        requireAdmin();
        Invoice original = getInvoice(invoiceId);
        requireTuitionInvoice(original);
        if (original.getStatus() != InvoiceStatus.PAID) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ hoàn tiền cho hóa đơn đã PAID");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0
                || request.getAmount().compareTo(original.getAmount()) > 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Số tiền hoàn phải lớn hơn 0 và không vượt số tiền đã thu");
        }
        if (invoiceRepository.existsByOriginalInvoiceId(original.getId())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn gốc đã có chứng từ hoàn tiền");
        }

        Long actorId = SecurityUtils.requireCurrentAccountId();
        Invoice refund = new Invoice();
        refund.setInvoiceCode(generateInvoiceCode());
        refund.setType(InvoiceType.REFUND);
        refund.setOriginalInvoiceId(original.getId());
        refund.setAccountId(original.getAccountId());
        refund.setStudentId(original.getStudentId());
        refund.setLeadId(original.getLeadId());
        refund.setCourseId(original.getCourseId());
        refund.setAmount(request.getAmount());
        refund.setStatus(InvoiceStatus.PAID);
        refund.setPaymentMethod(request.getPaymentMethod());
        refund.setTransactionReference(request.getTransactionReference());
        refund.setPaidAt(LocalDateTime.now());
        refund.setConfirmedBy(actorId);
        refund.setCreatedBy(actorId);
        refund.setReason(request.getReason().trim());
        return InvoiceResponse.from(invoiceRepository.save(refund));
    }

    private void validateOwnerReferences(Long accountId, Long studentId, Long leadId) {
        int owners = (accountId == null ? 0 : 1) + (studentId == null ? 0 : 1) + (leadId == null ? 0 : 1);
        if (owners != 1) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Cần cung cấp chính xác một accountId, studentId hoặc leadId");
        }
        if (accountId != null && !accountRepository.existsById(accountId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại");
        }
        if (studentId != null && !studentRepository.existsById(studentId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Học viên không tồn tại");
        }
        if (leadId != null && !leadRepository.existsById(leadId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Lead không tồn tại");
        }
    }

    private Course getCourse(Long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
    }

    private Invoice getInvoice(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
    }

    private void requireTuitionInvoice(Invoice invoice) {
        if (invoice.getType() != InvoiceType.TUITION_PAYMENT) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thao tác này chỉ áp dụng cho hóa đơn thu học phí");
        }
    }

    private void requirePayable(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.PENDING && invoice.getStatus() != InvoiceStatus.OVERDUE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn không ở trạng thái có thể thanh toán");
        }
    }

    private void requireAdmin() {
        if (!SecurityUtils.hasRole("ADMIN")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Thao tác này chỉ dành cho nhân viên quản lý học phí");
        }
    }

    private void requireCanView(Invoice invoice) {
        if (SecurityUtils.hasRole("ADMIN")) return;
        Long accountId = SecurityUtils.requireCurrentAccountId();
        boolean ownsAsAccount = accountId.equals(invoice.getAccountId());
        boolean ownsAsStudent = invoice.getStudentId() != null
                && studentRepository.findByUserId(accountId)
                .map(student -> student.getId().equals(invoice.getStudentId())).orElse(false);
        if (!ownsAsAccount && !ownsAsStudent) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền xem hóa đơn này");
        }
    }

    private String generateInvoiceCode() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "INV-" + date + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
