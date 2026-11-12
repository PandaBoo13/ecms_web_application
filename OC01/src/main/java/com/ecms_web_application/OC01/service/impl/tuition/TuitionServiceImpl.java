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
import com.ecms_web_application.OC01.dto.response.tuition.PublicCheckoutResponse;
import com.ecms_web_application.OC01.dto.response.tuition.TuitionInvoiceStatsResponse;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.PaymentMethod;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.event.InvoiceExtendedEvent;
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
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
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
    private final EnrollmentService enrollmentService;
    private final ApplicationEventPublisher eventPublisher;
    private final TuitionPaymentLinkService paymentLinkService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public InvoiceResponse createOfflineInvoice(CreateInvoiceRequest request) {
        requireAdmin();
        Course course = getCourse(request.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ tạo hóa đơn thủ công cho khóa OFFLINE");
        }
        validateOwnerReferences(request.getStudentId(), request.getLeadId());
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
        course = lockOfflineCourse(course.getId());
        ensureOfflineInvoiceCapacity(course, null);

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setCourseId(course.getId());
        invoice.setStudentId(request.getStudentId());
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
        return toResponse(createOrReuseOnlineCheckoutInvoice(courseId, request, accountId));
    }

    @Override
    @Transactional
    public PublicCheckoutResponse createPublicOnlineCheckout(Long courseId, OnlineCheckoutRequest request) {
        // Khách chưa đăng nhập: email trùng tài khoản có sẵn sẽ được yêu cầu đăng nhập để xác minh.
        Invoice invoice = createOrReuseOnlineCheckoutInvoice(courseId, request, SecurityUtils.getCurrentAccountId());
        String paymentToken = invoice.getStatus() == InvoiceStatus.PENDING
                ? paymentLinkService.createPaymentToken(invoice.getId())
                : null;
        Course course = courseRepository.findById(invoice.getCourseId()).orElse(null);
        return new PublicCheckoutResponse(
                invoice.getId(),
                invoice.getInvoiceCode(),
                invoice.getCourseId(),
                course != null ? course.getTitle() : null,
                invoice.getAmount(),
                invoice.getStatus(),
                paymentToken);
    }

    private Invoice createOrReuseOnlineCheckoutInvoice(Long courseId, OnlineCheckoutRequest request, Long accountId) {
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

        CheckoutOwner owner = resolveCheckoutOwner(accountId, request.getPayerEmail());
        Lead lead = null;
        if (owner.student() == null) {
            lead = resolveOrCreateCheckoutLead(request, courseId);
            // A consulted lead may already have been converted into a student.
            if (lead.getStudentId() != null) {
                Student existing = studentRepository.findById(lead.getStudentId()).orElse(null);
                if (existing != null) {
                    owner = new CheckoutOwner(existing);
                    lead = null;
                }
            }
        }
        if (owner.student() != null
                && enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                        courseId, owner.student().getId(), EnrollmentStatus.TERMINATED)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Bạn đã mua khóa học này.");
        }

        Invoice pending = findCheckoutInvoice(courseId, owner, lead, InvoiceStatus.PENDING);
        if (pending != null) {
            applyCheckoutContact(pending, request);
            syncInvoiceOwner(pending, owner, lead);
            pending.setStatus(InvoiceStatus.PENDING);
            pending.setDueAt(null);
            return invoiceRepository.save(pending);
        }

        // Compatibility for online invoices created before online checkouts became non-expiring.
        Invoice overdue = findCheckoutInvoice(courseId, owner, lead, InvoiceStatus.OVERDUE);
        if (overdue != null) {
            applyCheckoutContact(overdue, request);
            syncInvoiceOwner(overdue, owner, lead);
            overdue.setStatus(InvoiceStatus.PENDING);
            overdue.setDueAt(null);
            return invoiceRepository.save(overdue);
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceCode(generateInvoiceCode());
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setCourseId(course.getId());
        invoice.setAmount(course.getPrice());
        invoice.setStatus(InvoiceStatus.PENDING);
        // Online purchases remain payable until the learner completes payment.
        invoice.setDueAt(null);
        invoice.setCreatedBy(accountId);
        applyCheckoutContact(invoice, request);
        syncInvoiceOwner(invoice, owner, lead);
        return invoiceRepository.save(invoice);
    }

    private record CheckoutOwner(Student student) { }

    /**
     * Xác định chủ sở hữu hóa đơn.
     * - Người đang đăng nhập: luôn dùng tài khoản hiện tại; email trên hóa đơn chỉ là thông tin liên hệ.
     * - Khách chưa đăng nhập: nếu email đã thuộc một tài khoản, yêu cầu đăng nhập thay vì tự động
     *   gắn hóa đơn vào tài khoản đó (tránh gắn hóa đơn/ghi danh sai tài khoản khi chưa xác minh email).
     */
    private CheckoutOwner resolveCheckoutOwner(Long currentAccountId, String payerEmail) {
        if (currentAccountId != null) {
            Student student = studentRepository.findByUserId(currentAccountId).orElse(null);
            return new CheckoutOwner(student);
        }
        if (payerEmail != null && !payerEmail.isBlank()
                && accountRepository.findByEmail(payerEmail.trim().toLowerCase(Locale.ROOT)).isPresent()) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Email này đã gắn với một tài khoản ECMS. Vui lòng đăng nhập để tiếp tục thanh toán.",
                    "CHECKOUT_ACCOUNT_EXISTS");
        }
        return new CheckoutOwner(null);
    }

    private Lead resolveOrCreateCheckoutLead(OnlineCheckoutRequest request, Long courseId) {
        String normalizedEmail = request.getPayerEmail().trim().toLowerCase();
        Lead lead = leadRepository.findFirstByEmailOrderByCreatedAtDesc(normalizedEmail).orElse(null);
        if (lead != null) {
            return lead;
        }
        lead = new Lead();
        lead.setFullName(request.getPayerName().trim());
        lead.setEmail(normalizedEmail);
        lead.setPhone(request.getPayerPhone().trim());
        lead.setCourseId(courseId);
        lead.setStatus("NEW");
        lead.setSourceName("Website");
        lead.setChannelType("ONLINE");
        lead.setNote("Khách để lại thông tin khi mua khóa học online");
        return leadRepository.save(lead);
    }

    private Invoice findCheckoutInvoice(Long courseId, CheckoutOwner owner, Lead lead, InvoiceStatus status) {
        if (owner.student() != null) {
            Invoice found = invoiceRepository
                    .findFirstByStudentIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
                            owner.student().getId(), courseId, InvoiceType.TUITION_PAYMENT, status)
                    .orElse(null);
            if (found != null) {
                return found;
            }
        }
        if (lead != null) {
            Invoice found = invoiceRepository
                    .findFirstByLeadIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
                            lead.getId(), courseId, InvoiceType.TUITION_PAYMENT, status)
                    .orElse(null);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    private void syncInvoiceOwner(Invoice invoice, CheckoutOwner owner, Lead lead) {
        if (owner.student() != null) {
            invoice.setStudentId(owner.student().getId());
            invoice.setLeadId(owner.student().getLeadId());
        } else if (lead != null) {
            invoice.setLeadId(lead.getId());
        }
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
        Course course = lockOfflineCourse(lead.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ tạo hóa đơn thủ công cho khóa OFFLINE");
        }
        if (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Khóa học chưa có học phí hợp lệ");
        }
        ensureOfflineInvoiceCapacity(course, null);
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
        PaymentLinkResponse link = paymentLinkService.queuePaymentLink(saved.getId(), request.getEmail());
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
        Course course = lockOfflineCourse(request.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ tạo hóa đơn thủ công cho khóa OFFLINE");
        }
        if (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Khóa học chưa có học phí hợp lệ");
        }
        ensureOfflineInvoiceCapacity(course, null);
        if (invoiceRepository.existsByStudentIdAndCourseIdAndTypeAndStatusIn(
                student.getId(), course.getId(), InvoiceType.TUITION_PAYMENT,
                List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE))) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Học viên đã có hóa đơn học phí đang mở cho khóa này");
        }
        if (enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                course.getId(), student.getId(), EnrollmentStatus.TERMINATED)) {
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
        PaymentLinkResponse link = paymentLinkService.queuePaymentLink(saved.getId(), request.getEmail());
        return new CreateInvoiceFromLeadResponse(toResponse(saved), link);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> search(InvoiceType type, InvoiceStatus status, CourseType courseType, Long courseId,
                                        Long studentId, Long leadId, String search, boolean refundable,
                                        Pageable pageable) {
        Long ownerStudentId = null;
        if (!SecurityUtils.hasRole("ADMIN")) {
            Long currentAccountId = SecurityUtils.requireCurrentAccountId();
            ownerStudentId = studentRepository.findByUserId(currentAccountId).map(Student::getId).orElse(-1L);
        }
        Page<Invoice> page = invoiceRepository.findAll(buildSearchSpecification(type, status, courseType, courseId,
                studentId, leadId, ownerStudentId, search, refundable), pageable);
        InvoiceResponseContext context = loadResponseContext(page.getContent());
        return page.map(invoice -> toResponse(invoice, context));
    }

    @Override
    @Transactional(readOnly = true)
    public TuitionInvoiceStatsResponse getStats() {
        Long ownerStudentId = null;
        if (!SecurityUtils.hasRole("ADMIN")) {
            Long currentAccountId = SecurityUtils.requireCurrentAccountId();
            ownerStudentId = studentRepository.findByUserId(currentAccountId).map(Student::getId).orElse(-1L);
        }

        Map<InvoiceStatus, Long> counts = new EnumMap<>(InvoiceStatus.class);
        for (Object[] row : invoiceRepository.countByTypeGroupedByStatus(
                InvoiceType.TUITION_PAYMENT, ownerStudentId)) {
            counts.put((InvoiceStatus) row[0], ((Number) row[1]).longValue());
        }
        long total = counts.values().stream().mapToLong(Long::longValue).sum();
        // PENDING đã qua hạn thanh toán được đếm là OVERDUE, khớp trạng thái hiển thị
        // ở danh sách hóa đơn (job định kỳ cập nhật cột status có thể chưa chạy).
        long expiredPending = invoiceRepository.countExpiredPendingTuitionInvoices(
                InvoiceType.TUITION_PAYMENT, InvoiceStatus.PENDING, LocalDateTime.now(),
                ownerStudentId);
        return new TuitionInvoiceStatsResponse(total,
                counts.getOrDefault(InvoiceStatus.PENDING, 0L) - expiredPending,
                counts.getOrDefault(InvoiceStatus.PAID, 0L),
                counts.getOrDefault(InvoiceStatus.OVERDUE, 0L) + expiredPending,
                counts.getOrDefault(InvoiceStatus.CANCELLED, 0L));
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
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
        requireTuitionInvoice(invoice);
        requirePayable(invoice);
        Course course = lockOfflineCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ xác nhận tiền mặt cho khóa OFFLINE");
        }
        if (invoiceNeedsCapacity(invoice)) {
            ensureOfflineInvoiceCapacity(course, invoice.getId());
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
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
        requireTuitionInvoice(invoice);
        requirePayable(invoice);
        Course course = lockOfflineCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ xác nhận chuyển khoản cho khóa OFFLINE");
        }
        if (transactionReference == null || transactionReference.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng nhập mã giao dịch ngân hàng");
        }
        if (invoiceNeedsCapacity(invoice)) {
            ensureOfflineInvoiceCapacity(course, invoice.getId());
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
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
        requireTuitionInvoice(invoice);
        // Chấp nhận cả PENDING đã qua hạn: hiển thị là OVERDUE ngay khi hết hạn
        // chứ không đợi job định kỳ cập nhật cột status trong DB.
        if (!isEffectivelyOverdue(invoice, LocalDateTime.now())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ gia hạn được hóa đơn đã quá hạn thanh toán");
        }
        Course course = lockOfflineCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE || request.getDueAt() == null
                || !request.getDueAt().isAfter(LocalDateTime.now())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Hạn thanh toán mới không hợp lệ");
        }
        ensureOfflineInvoiceCapacity(course, invoice.getId());
        invoice.setDueAt(request.getDueAt());
        invoice.setStatus(InvoiceStatus.PENDING);
        Invoice saved = invoiceRepository.save(invoice);
        if (saved.getStudentId() == null) {
            eventPublisher.publishEvent(new InvoiceExtendedEvent(saved.getId()));
        }
        return InvoiceResponse.from(saved);
    }

    @Override
    @Transactional
    public InvoiceResponse cancel(Long invoiceId, CancelInvoiceRequest request) {
        requireAdmin();
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
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
        Invoice original = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
        requireTuitionInvoice(original);
        if (original.getStatus() != InvoiceStatus.PAID) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ hoàn tiền cho hóa đơn đã PAID");
        }
        // Hoàn tiền chỉ áp dụng khóa OFFLINE; khóa ONLINE không có nghiệp vụ hoàn tiền.
        Course originalCourse = getCourse(original.getCourseId());
        if (originalCourse.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ hoàn tiền cho hóa đơn khóa OFFLINE");
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
        refund.setStudentId(original.getStudentId());
        refund.setLeadId(original.getLeadId());
        refund.setPayerName(request.getPayerName().trim());
        refund.setPayerEmail(request.getPayerEmail().trim());
        refund.setPayerPhone(trimToNull(request.getPayerPhone()));
        refund.setCourseId(original.getCourseId());
        refund.setAmount(request.getAmount());
        refund.setStatus(InvoiceStatus.PAID);
        refund.setPaymentMethod(request.getPaymentMethod());
        refund.setTransactionReference(trimToNull(request.getTransactionReference()));
        refund.setPaidAt(request.getRefundedAt() != null ? request.getRefundedAt() : LocalDateTime.now());
        refund.setConfirmedBy(actorId);
        refund.setCreatedBy(actorId);
        refund.setReason(request.getReason().trim());
        refund.setPaymentProofUrl(request.getProofUrl().trim());
        Invoice saved = invoiceRepository.save(refund);

        auditLogService.log("REFUND", "Invoice", saved.getId(),
                "Hoàn tiền cho hóa đơn " + original.getInvoiceCode() + " với số tiền " + saved.getAmount());

        // Hoàn đủ 100%: chấm dứt ghi danh để ngừng quyền học và giải phóng chỗ.
        // Hoàn một phần giữ nguyên ghi danh để học viên tiếp tục theo học.
        if (saved.getAmount().compareTo(original.getAmount()) == 0) {
            enrollmentService.terminateForFullRefund(original.getId(), actorId,
                    "Hoàn tiền toàn phần hóa đơn " + original.getInvoiceCode()
                            + " - Lý do: " + saved.getReason());
        }

        eventPublisher.publishEvent(new InvoiceRefundedEvent(saved.getId()));

        return toResponse(saved);
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        return toResponse(invoice, loadResponseContext(List.of(invoice)));
    }

    /**
     * Nạp trước học viên/lead/tài khoản/khóa học/hóa đơn gốc cho cả trang bằng vài query,
     * thay vì mỗi dòng hóa đơn lại truy vấn riêng (N+1).
     */
    private InvoiceResponseContext loadResponseContext(List<Invoice> invoices) {
        if (invoices.isEmpty()) {
            return new InvoiceResponseContext(Map.of(), Map.of(), Map.of(), Map.of());
        }

        Set<Long> studentIds = new HashSet<>();
        Set<Long> leadIds = new HashSet<>();
        Set<Long> courseIds = new HashSet<>();
        Set<Long> originalInvoiceIds = new HashSet<>();
        for (Invoice invoice : invoices) {
            addIfPresent(studentIds, invoice.getStudentId());
            addIfPresent(leadIds, invoice.getLeadId());
            addIfPresent(courseIds, invoice.getCourseId());
            addIfPresent(originalInvoiceIds, invoice.getOriginalInvoiceId());
        }

        Map<Long, Student> students = studentIds.isEmpty() ? Map.of()
                : studentRepository.findAllById(studentIds).stream()
                        .collect(Collectors.toMap(Student::getId, student -> student));
        Map<Long, Lead> leads = leadIds.isEmpty() ? Map.of()
                : leadRepository.findAllById(leadIds).stream()
                        .collect(Collectors.toMap(Lead::getId, lead -> lead));
        Map<Long, Course> courses = courseIds.isEmpty() ? Map.of()
                : courseRepository.findAllById(courseIds).stream()
                        .collect(Collectors.toMap(Course::getId, course -> course));
        Map<Long, Invoice> originalInvoices = originalInvoiceIds.isEmpty() ? Map.of()
                : invoiceRepository.findAllById(originalInvoiceIds).stream()
                        .collect(Collectors.toMap(Invoice::getId, invoice -> invoice));
        return new InvoiceResponseContext(students, leads, courses, originalInvoices);
    }

    private void addIfPresent(Set<Long> ids, Long id) {
        if (id != null) {
            ids.add(id);
        }
    }

    private InvoiceResponse toResponse(Invoice invoice, InvoiceResponseContext context) {
        String name = invoice.getPayerName(), email = invoice.getPayerEmail(), phone = invoice.getPayerPhone();
        if (email == null && invoice.getStudentId() != null) {
            Student student = context.students().get(invoice.getStudentId());
            if (student != null) { name = student.getFullName(); email = student.getEmail(); phone = student.getPhone(); }
        } else if (email == null && invoice.getLeadId() != null) {
            Lead lead = context.leads().get(invoice.getLeadId());
            if (lead != null) { name = lead.getFullName(); email = lead.getEmail(); phone = lead.getPhone(); }
        }
        Course course = invoice.getCourseId() == null ? null : context.courses().get(invoice.getCourseId());
        Invoice original = invoice.getOriginalInvoiceId() == null ? null
                : context.originalInvoices().get(invoice.getOriginalInvoiceId());
        return InvoiceResponse.from(invoice, name, email, phone,
                course == null ? null : course.getTitle(), course == null ? null : course.getCourseType(),
                original == null ? null : original.getInvoiceCode());
    }

    private record InvoiceResponseContext(
            Map<Long, Student> students,
            Map<Long, Lead> leads,
            Map<Long, Course> courses,
            Map<Long, Invoice> originalInvoices
    ) {
    }

    private Specification<Invoice> buildSearchSpecification(InvoiceType type, InvoiceStatus status, CourseType courseType,
            Long courseId, Long studentId, Long leadId, Long ownerStudentId,
            String search, boolean refundable) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (status != null) {
                if (status == InvoiceStatus.PENDING) {
                    // "Chờ thanh toán" = PENDING và chưa qua hạn thanh toán, khớp trạng thái hiển thị.
                    predicates.add(cb.equal(root.get("status"), InvoiceStatus.PENDING));
                    predicates.add(cb.or(cb.isNull(root.get("dueAt")),
                            cb.greaterThan(root.get("dueAt"), LocalDateTime.now())));
                } else if (status == InvoiceStatus.OVERDUE) {
                    // "Quá hạn" = OVERDUE đã lưu hoặc PENDING đã qua hạn (job cập nhật DB có thể chưa chạy).
                    predicates.add(cb.or(
                            cb.equal(root.get("status"), InvoiceStatus.OVERDUE),
                            cb.and(cb.equal(root.get("status"), InvoiceStatus.PENDING),
                                    cb.lessThanOrEqualTo(root.get("dueAt"), LocalDateTime.now()))));
                } else {
                    predicates.add(cb.equal(root.get("status"), status));
                }
            }
            if (refundable) {
                predicates.add(cb.equal(root.get("type"), InvoiceType.TUITION_PAYMENT));
                predicates.add(cb.equal(root.get("status"), InvoiceStatus.PAID));
                // Hoàn tiền chỉ áp dụng cho khóa OFFLINE.
                var offlineCourseQuery = query.subquery(Long.class);
                var offlineCourse = offlineCourseQuery.from(Course.class);
                offlineCourseQuery.select(offlineCourse.get("id"))
                        .where(cb.equal(offlineCourse.get("courseType"), CourseType.OFFLINE));
                predicates.add(root.get("courseId").in(offlineCourseQuery));
                if (query != null) {
                    var refundQuery = query.subquery(Long.class);
                    var refund = refundQuery.from(Invoice.class);
                    refundQuery.select(refund.get("id")).where(
                            cb.equal(refund.get("originalInvoiceId"), root.get("id")),
                            cb.equal(refund.get("type"), InvoiceType.REFUND));
                    predicates.add(cb.not(cb.exists(refundQuery)));
                }
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
            if (leadId != null) {
                predicates.add(cb.equal(root.get("leadId"), leadId));
            }
            if (ownerStudentId != null) {
                predicates.add(cb.equal(root.get("studentId"), ownerStudentId));
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
                var courseQuery = query.subquery(Long.class);
                var course = courseQuery.from(Course.class);
                courseQuery.select(course.get("id")).where(cb.or(
                        cb.like(cb.lower(course.get("title")), pattern), cb.like(cb.lower(course.get("code")), pattern)));
                var originalInvoiceQuery = query.subquery(Long.class);
                var originalInvoice = originalInvoiceQuery.from(Invoice.class);
                originalInvoiceQuery.select(originalInvoice.get("id"))
                        .where(cb.like(cb.lower(originalInvoice.get("invoiceCode")), pattern));
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("invoiceCode")), pattern),
                        cb.like(cb.lower(root.get("payerName")), pattern),
                        cb.like(cb.lower(root.get("payerEmail")), pattern),
                        cb.like(cb.lower(root.get("payerPhone")), pattern),
                        root.get("studentId").in(studentQuery), root.get("leadId").in(leadQuery),
                        root.get("courseId").in(courseQuery),
                        root.get("originalInvoiceId").in(originalInvoiceQuery)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void validateOwnerReferences(Long studentId, Long leadId) {
        int owners = (studentId == null ? 0 : 1) + (leadId == null ? 0 : 1);
        if (owners != 1) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Cần cung cấp chính xác một studentId hoặc leadId");
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

    private Course lockOfflineCourse(Long courseId) {
        Course course = courseRepository.findByIdForUpdate(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thao tác này chỉ áp dụng cho khóa OFFLINE");
        }
        return course;
    }

    /** Capacity is based on effective tuition invoices, not only enrollments/currentStudents. */
    private void ensureOfflineInvoiceCapacity(Course course, Long excludedInvoiceId) {
        Integer maximum = course.getMaxStudents();
        if (maximum == null || maximum <= 0) return;
        long effectiveInvoices = invoiceRepository.countEffectiveTuitionInvoicesByCourse(
                course.getId(), InvoiceType.TUITION_PAYMENT, InvoiceStatus.PENDING, InvoiceStatus.PAID,
                InvoiceType.REFUND, LocalDateTime.now(), excludedInvoiceId);
        if (effectiveInvoices >= maximum) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Khóa học đã đủ sĩ số theo số hóa đơn còn hiệu lực; không thể tạo hoặc kích hoạt hóa đơn mới");
        }
    }

    private boolean invoiceNeedsCapacity(Invoice invoice) {
        return isEffectivelyOverdue(invoice, LocalDateTime.now());
    }

    /** OVERDUE đã lưu, hoặc PENDING đã qua hạn thanh toán (chưa kịp job cập nhật DB). */
    private boolean isEffectivelyOverdue(Invoice invoice, LocalDateTime now) {
        return invoice.getStatus() == InvoiceStatus.OVERDUE
                || (invoice.getStatus() == InvoiceStatus.PENDING
                && invoice.getDueAt() != null && !invoice.getDueAt().isAfter(now));
    }

    private Invoice getInvoice(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
        boolean ownsAsStudent = invoice.getStudentId() != null
                && studentRepository.findByUserId(accountId)
                .map(student -> student.getId().equals(invoice.getStudentId())).orElse(false);
        if (!ownsAsStudent) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền xem hóa đơn này");
        }
    }

    private String generateInvoiceCode() {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return "INV-" + date + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
