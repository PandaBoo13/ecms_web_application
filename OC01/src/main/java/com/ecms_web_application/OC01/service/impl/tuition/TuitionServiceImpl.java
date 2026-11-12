package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.tuition.CancelInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceFromStudentRequest;
import com.ecms_web_application.OC01.dto.request.tuition.CreateInvoiceRequest;
import com.ecms_web_application.OC01.dto.request.tuition.OnlineCheckoutRequest;
import com.ecms_web_application.OC01.dto.request.tuition.ExtendInvoiceDueDateRequest;
import com.ecms_web_application.OC01.dto.request.tuition.RefundInvoiceRequest;
import com.ecms_web_application.OC01.dto.response.tuition.CreateInvoiceFromLeadResponse;
import com.ecms_web_application.OC01.dto.response.tuition.EligibleLeadResponse;
import com.ecms_web_application.OC01.dto.response.tuition.InvoiceResponse;
import com.ecms_web_application.OC01.dto.response.tuition.PaymentLinkResponse;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.TuitionService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TuitionServiceImpl implements TuitionService {
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final LeadRepository leadRepository;
    private final AccountRepository accountRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TuitionPaymentLinkService paymentLinkService;

    @Override
    @Transactional
    public InvoiceResponse createOfflineInvoice(CreateInvoiceRequest request) {
        requireAdmin();
        Course course = getCourse(request.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ tạo hóa đơn thủ công cho khóa OFFLINE");
        }
        if (request.getAccountId() != null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Hóa đơn OFFLINE phải liên kết với Lead mới hoặc hồ sơ học viên hiện có");
        }
        validateOwnerReferences(null, request.getStudentId(), request.getLeadId());
        if (request.getLeadId() != null) {
            Lead lead = leadRepository.findById(request.getLeadId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Lead không tồn tại"));
            if (lead.getStudentId() != null) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Lead đã có hồ sơ học viên; hãy tạo hóa đơn theo studentId");
            }
        }
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
    public InvoiceResponse createOnlineCheckoutInvoice(Long courseId, OnlineCheckoutRequest request) {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        Course course = getCourse(courseId);
        if (course.getCourseType() != CourseType.ONLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Checkout này chỉ áp dụng cho khóa ONLINE");
        }
        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa học hiện chưa được mở bán");
        }
        if (Boolean.TRUE.equals(course.getIsFree()) || course.getPrice() == null
                || course.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Khóa học miễn phí không cần tạo hóa đơn");
        }
        if (enrollmentRepository.existsByAccountIdAndCourseIdAndEnrollmentType(
                accountId, courseId, EnrollmentType.ONLINE)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Tài khoản đã có ghi danh khóa học này");
        }

        Invoice pending = invoiceRepository.findFirstByAccountIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
                accountId, courseId, InvoiceType.TUITION_PAYMENT, InvoiceStatus.PENDING).orElse(null);
        if (pending != null) {
            applyCheckoutContact(pending, request);
            if (pending.getDueAt() != null) {
                pending.setDueAt(null);
            }
            return toResponse(invoiceRepository.save(pending));
        }

        // Compatibility for online invoices created before online checkouts became non-expiring.
        Invoice overdue = invoiceRepository.findFirstByAccountIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
                accountId, courseId, InvoiceType.TUITION_PAYMENT, InvoiceStatus.OVERDUE).orElse(null);
        if (overdue != null) {
            overdue.setStatus(InvoiceStatus.PENDING);
            overdue.setDueAt(null);
            applyCheckoutContact(overdue, request);
            return toResponse(invoiceRepository.save(overdue));
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setCourseId(course.getId());
        invoice.setAccountId(accountId);
        applyCheckoutContact(invoice, request);
        invoice.setAmount(course.getPrice());
        invoice.setStatus(InvoiceStatus.PENDING);
        // Online purchases remain payable until the learner completes payment.
        invoice.setDueAt(null);
        invoice.setCreatedBy(accountId);
        return toResponse(invoiceRepository.save(invoice));
    }

    private void applyCheckoutContact(Invoice invoice, OnlineCheckoutRequest request) {
        invoice.setPayerName(request.getPayerName().trim());
        invoice.setPayerEmail(request.getPayerEmail().trim().toLowerCase());
        invoice.setPayerPhone(request.getPayerPhone().trim());
    }

    private static final List<InvoiceStatus> ACTIVE_INVOICE_STATUSES = List.of(
            InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE);

    @Override
    @Transactional(readOnly = true)
    public Page<EligibleLeadResponse> searchEligibleLeads(String search, Pageable pageable) {
        requireAdmin();
        Page<Lead> leads;
        if (search == null || search.trim().isEmpty()) {
            leads = leadRepository.findConsultedLeads(
                    InvoiceType.TUITION_PAYMENT, ACTIVE_INVOICE_STATUSES, pageable);
        } else {
            leads = leadRepository.searchConsultedLeads(
                    search.trim(), InvoiceType.TUITION_PAYMENT, ACTIVE_INVOICE_STATUSES, pageable);
        }

        if (leads.isEmpty()) {
            return Page.empty(pageable);
        }

        // Batch-fetch tất cả Course liên quan trong 1 query thay vì N+1
        Set<Long> courseIds = leads.stream()
                .map(Lead::getCourseId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Course> courseMap = courseIds.isEmpty() ? Map.of()
                : courseRepository.findAllById(courseIds).stream()
                        .collect(Collectors.toMap(Course::getId, c -> c, (c1, c2) -> c1));

        return leads.map(lead -> {
            Course course = lead.getCourseId() == null ? null : courseMap.get(lead.getCourseId());
            return new EligibleLeadResponse(
                    lead.getId(), lead.getFullName(), lead.getEmail(), lead.getPhone(),
                    lead.getCourseId(),
                    course == null ? null : course.getTitle(),
                    course == null ? null : course.getPrice(),
                    lead.getConsultedAt(), lead.getAssignedConsultantId(), lead.getNote());
        });
    }

    @Override
    @Transactional
    public CreateInvoiceFromLeadResponse createInvoiceFromLead(CreateInvoiceFromLeadRequest request) {
        requireAdmin();
        Long actorId = SecurityUtils.requireCurrentAccountId();
        Lead lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Lead không tồn tại"));
        if (!"CONSULTED".equalsIgnoreCase(lead.getStatus())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ tạo hóa đơn cho lead đã được tư vấn");
        }
        if (lead.getStudentId() != null) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Lead đã được chuyển thành học viên; hãy tạo hóa đơn theo học viên");
        }
        if (lead.getCourseId() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lead chưa chọn khóa học");
        }
        Course course = getCourse(lead.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ tạo hóa đơn thủ công cho khóa OFFLINE");
        }
        if (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Khóa học chưa có học phí hợp lệ");
        }
        if (invoiceRepository.existsByLeadIdAndCourseIdAndTypeAndStatusIn(
                lead.getId(), course.getId(), InvoiceType.TUITION_PAYMENT,
                List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE))) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Lead đã có hóa đơn học phí đang mở cho khóa này");
        }

        PaymentMethod method = request.getPaymentMethod();
        if (method != PaymentMethod.CASH && method != PaymentMethod.BANK_TRANSFER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Phương thức thanh toán không hợp lệ");
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setCourseId(course.getId());
        invoice.setLeadId(lead.getId());
        invoice.setAmount(course.getPrice());
        invoice.setCreatedBy(actorId);
        invoice.setPaymentMethod(method);

        if (method == PaymentMethod.CASH) {
            if (request.getProofUrl() == null || request.getProofUrl().isBlank()) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng tải ảnh chứng từ thu tiền mặt");
            }
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(LocalDateTime.now());
            invoice.setConfirmedBy(actorId);
            invoice.setPaymentProofUrl(request.getProofUrl().trim());
            Invoice saved = invoiceRepository.save(invoice);
            eventPublisher.publishEvent(new InvoicePaidEvent(saved.getId()));
            return new CreateInvoiceFromLeadResponse(toResponse(saved), null);
        }

        // Chuyển khoản: hạn thanh toán trùng hạn của link VNPAY, tự động 24 giờ.
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setDueAt(LocalDateTime.now().plusHours(24));
        Invoice saved = invoiceRepository.save(invoice);
        PaymentLinkResponse link = paymentLinkService.sendPaymentLink(saved.getId(), request.getEmail());
        return new CreateInvoiceFromLeadResponse(toResponse(saved), link);
    }

    @Override
    @Transactional
    public CreateInvoiceFromLeadResponse createInvoiceFromStudent(CreateInvoiceFromStudentRequest request) {
        requireAdmin();
        Long actorId = SecurityUtils.requireCurrentAccountId();
        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Học viên không tồn tại"));
        if ("INACTIVE".equalsIgnoreCase(student.getStatus())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Học viên đã ngừng hoạt động; không thể tạo hóa đơn");
        }
        Course course = getCourse(request.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ tạo hóa đơn thủ công cho khóa OFFLINE");
        }
        if (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Khóa học chưa có học phí hợp lệ");
        }
        if (invoiceRepository.existsByStudentIdAndCourseIdAndTypeAndStatusIn(
                student.getId(), course.getId(), InvoiceType.TUITION_PAYMENT,
                List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE))) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Học viên đã có hóa đơn học phí đang mở cho khóa này");
        }
        if (enrollmentRepository.existsByCourseIdAndStudentId(course.getId(), student.getId())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Học viên đã được ghi danh vào khóa học này");
        }

        PaymentMethod method = request.getPaymentMethod();
        if (method != PaymentMethod.CASH && method != PaymentMethod.BANK_TRANSFER) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Phương thức thanh toán không hợp lệ");
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setCourseId(course.getId());
        invoice.setStudentId(student.getId());
        invoice.setAmount(course.getPrice());
        invoice.setCreatedBy(actorId);
        invoice.setPaymentMethod(method);

        if (method == PaymentMethod.CASH) {
            if (request.getProofUrl() == null || request.getProofUrl().isBlank()) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng tải ảnh chứng từ thu tiền mặt");
            }
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidAt(LocalDateTime.now());
            invoice.setConfirmedBy(actorId);
            invoice.setPaymentProofUrl(request.getProofUrl().trim());
            Invoice saved = invoiceRepository.save(invoice);
            eventPublisher.publishEvent(new InvoicePaidEvent(saved.getId()));
            return new CreateInvoiceFromLeadResponse(toResponse(saved), null);
        }

        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setDueAt(LocalDateTime.now().plusHours(24));
        Invoice saved = invoiceRepository.save(invoice);
        PaymentLinkResponse link = paymentLinkService.sendPaymentLink(saved.getId(), request.getEmail());
        return new CreateInvoiceFromLeadResponse(toResponse(saved), link);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> search(InvoiceType type, InvoiceStatus status, CourseType courseType, Long courseId,
                                        Long studentId, Long accountId, Long leadId, String search, Pageable pageable) {
        Long ownerAccountId = null;
        Long ownerStudentId = null;
        if (!SecurityUtils.hasRole("ADMIN")) {
            Long currentAccountId = SecurityUtils.requireCurrentAccountId();
            ownerAccountId = currentAccountId;
            ownerStudentId = studentRepository.findByUserId(currentAccountId).map(s -> s.getId()).orElse(-1L);
        }
        return invoiceRepository.findAll(buildSearchSpecification(type, status, courseType, courseId, studentId, accountId,
                        leadId, ownerAccountId, ownerStudentId, search), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getById(Long invoiceId) {
        Invoice invoice = getInvoice(invoiceId);
        requireCanView(invoice);
        return toResponse(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse confirmCashPayment(Long invoiceId, String proofUrl) {
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
        if (proofUrl != null && !proofUrl.isBlank()) {
            invoice.setPaymentProofUrl(proofUrl.trim());
        }
        Invoice saved = invoiceRepository.save(invoice);
        eventPublisher.publishEvent(new InvoicePaidEvent(saved.getId()));
        return InvoiceResponse.from(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse confirmBankTransferPayment(Long invoiceId, String transactionReference, String proofUrl) {
        requireAdmin();
        Invoice invoice = getInvoice(invoiceId);
        requireTuitionInvoice(invoice);
        requirePayable(invoice);
        Course course = getCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ xác nhận chuyển khoản cho khóa OFFLINE");
        }
        if (transactionReference == null || transactionReference.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng nhập mã giao dịch ngân hàng");
        }
        if (invoice.getStatus() == InvoiceStatus.OVERDUE && course.getMaxStudents() != null
                && course.getCurrentStudents() >= course.getMaxStudents()) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa học đã đủ sĩ số; không thể thu hóa đơn quá hạn");
        }

        invoice.setPaymentMethod(PaymentMethod.BANK_TRANSFER);
        invoice.setTransactionReference(transactionReference.trim());
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoice.setConfirmedBy(SecurityUtils.requireCurrentAccountId());
        if (proofUrl != null && !proofUrl.isBlank()) {
            invoice.setPaymentProofUrl(proofUrl.trim());
        }
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
        refund.setPaymentProofUrl(request.getProofUrl().trim());
        return InvoiceResponse.from(invoiceRepository.save(refund));
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        String name = invoice.getPayerName(), email = invoice.getPayerEmail(), phone = invoice.getPayerPhone();
        if (email == null && invoice.getStudentId() != null) {
            var student = studentRepository.findById(invoice.getStudentId()).orElse(null);
            if (student != null) { name = student.getFullName(); email = student.getEmail(); phone = student.getPhone(); }
        } else if (email == null && invoice.getLeadId() != null) {
            var lead = leadRepository.findById(invoice.getLeadId()).orElse(null);
            if (lead != null) { name = lead.getFullName(); email = lead.getEmail(); phone = lead.getPhone(); }
        } else if (email == null && invoice.getAccountId() != null) {
            var account = accountRepository.findById(invoice.getAccountId()).orElse(null);
            if (account != null) {
                email = account.getEmail();
                if (account.getUserProfile() != null) {
                    name = account.getUserProfile().getFullName(); phone = account.getUserProfile().getPhone();
                }
            }
        }
        Course course = invoice.getCourseId() == null ? null : courseRepository.findById(invoice.getCourseId()).orElse(null);
        return InvoiceResponse.from(invoice, name, email, phone,
                course == null ? null : course.getTitle(), course == null ? null : course.getCourseType());
    }

    private Specification<Invoice> buildSearchSpecification(InvoiceType type, InvoiceStatus status, CourseType courseType,
            Long courseId, Long studentId, Long accountId, Long leadId, Long ownerAccountId, Long ownerStudentId,
            String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (courseType != null) {
                var courseTypeQuery = query.subquery(Long.class);
                var course = courseTypeQuery.from(Course.class);
                courseTypeQuery.select(course.get("id"))
                        .where(cb.equal(course.get("courseType"), courseType));
                predicates.add(root.get("courseId").in(courseTypeQuery));
            }
            if (courseId != null) {
                predicates.add(cb.equal(root.get("courseId"), courseId));
            }
            if (studentId != null) {
                predicates.add(cb.equal(root.get("studentId"), studentId));
            }
            if (accountId != null) {
                predicates.add(cb.equal(root.get("accountId"), accountId));
            }
            if (leadId != null) {
                predicates.add(cb.equal(root.get("leadId"), leadId));
            }
            if (ownerAccountId != null) {
                predicates.add(cb.or(cb.equal(root.get("accountId"), ownerAccountId),
                        cb.equal(root.get("studentId"), ownerStudentId)));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                var studentQuery = query.subquery(Long.class);
                var student = studentQuery.from(com.ecms_web_application.OC01.entity.Student.class);
                studentQuery.select(student.get("id")).where(cb.or(
                        cb.like(cb.lower(student.get("fullName")), pattern),
                        cb.like(cb.lower(student.get("email")), pattern),
                        cb.like(cb.lower(student.get("studentCode")), pattern)));
                var leadQuery = query.subquery(Long.class);
                var lead = leadQuery.from(com.ecms_web_application.OC01.entity.Lead.class);
                leadQuery.select(lead.get("id")).where(cb.or(
                        cb.like(cb.lower(lead.get("fullName")), pattern),
                        cb.like(cb.lower(lead.get("email")), pattern),
                        cb.like(cb.lower(lead.get("phone")), pattern)));
                var accountQuery = query.subquery(Long.class);
                var account = accountQuery.from(com.ecms_web_application.OC01.entity.Account.class);
                accountQuery.select(account.get("id")).where(cb.or(
                        cb.like(cb.lower(account.get("email")), pattern),
                        cb.like(cb.lower(account.join("userProfile", jakarta.persistence.criteria.JoinType.LEFT).get("fullName")), pattern)));
                var courseQuery = query.subquery(Long.class);
                var course = courseQuery.from(Course.class);
                courseQuery.select(course.get("id")).where(cb.or(
                        cb.like(cb.lower(course.get("title")), pattern), cb.like(cb.lower(course.get("code")), pattern)));
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("invoiceCode")), pattern),
                        root.get("studentId").in(studentQuery), root.get("leadId").in(leadQuery),
                        root.get("accountId").in(accountQuery), root.get("courseId").in(courseQuery)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
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
