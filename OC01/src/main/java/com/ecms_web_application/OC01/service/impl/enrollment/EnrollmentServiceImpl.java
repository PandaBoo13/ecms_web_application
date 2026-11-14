package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.StudentConvertFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.SaveSessionAttendanceRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.StudentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceRecordResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentStatusLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.PendingEnrollmentCandidateResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.PendingEnrollmentBatchResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentSummaryResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentBatchActionResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.SessionAttendanceResponse;
import com.ecms_web_application.OC01.entity.*;
import com.ecms_web_application.OC01.entity.enums.*;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.*;
import com.ecms_web_application.OC01.service.EnrollmentService;
import com.ecms_web_application.OC01.service.StudentService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.course.Progress;
import com.ecms_web_application.OC01.entity.course.Session;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrollmentServiceImpl implements EnrollmentService {
    private static final long ATTENDANCE_LATE_GRACE_MINUTES = 10;
    private static final List<EnrollmentStatus> SEAT_HOLDING_STATUSES = List.of(EnrollmentStatus.PENDING,
            EnrollmentStatus.ACTIVE);

    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentStatusLogRepository statusLogRepository;
    private final StudentService studentService;
    private final AttendanceRecordRepository attendanceRepository;
    private final InvoiceRepository invoiceRepository;
    private final LeadRepository leadRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final AccountRepository accountRepository;
    private final SessionRepository sessionRepository;
    private final CourseResourceRepository courseResourceRepository;
    private final ProgressRepository progressRepository;
    private final com.ecms_web_application.OC01.service.ProgressCalculationService progressCalculationService;
    private final EntityManager entityManager;
    private final PlatformTransactionManager transactionManager;

    @Override
    @Transactional
    public EnrollmentResponse createOffline(Long invoiceId) {
        requireAdmin();
        return createOfflineFromPaidInvoice(invoiceId);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EnrollmentResponse createOfflineAfterPayment(Long invoiceId) {
        return createOfflineFromPaidInvoice(invoiceId);
    }

    @Override
    public PendingEnrollmentBatchResponse createPendingBatch(List<Long> invoiceIds) {
        requireAdmin();
        if (invoiceIds == null || invoiceIds.isEmpty() || invoiceIds.size() > 100) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mỗi lần cần chọn từ 1 đến 100 học viên");
        }

        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        List<PendingEnrollmentBatchResponse.Item> results = new ArrayList<>();
        Set<Long> uniqueInvoiceIds = new LinkedHashSet<>(invoiceIds);
        int enrolled = 0;
        for (Long invoiceId : uniqueInvoiceIds) {
            try {
                EnrollmentResponse result = transaction.execute(status -> createPendingFromPaidInvoice(invoiceId));
                results.add(new PendingEnrollmentBatchResponse.Item(
                        invoiceId, true, result != null ? result.enrollmentId() : null, "Ghi danh thành công"));
                enrolled++;
            } catch (Exception ex) {
                results.add(new PendingEnrollmentBatchResponse.Item(
                        invoiceId, false, null, ex.getMessage() != null ? ex.getMessage() : "Không thể ghi danh"));
            }
        }
        return new PendingEnrollmentBatchResponse(enrolled, results.size() - enrolled, results);
    }

    /** Hóa đơn PAID chưa có ghi danh: chọn đúng luồng theo loại khóa học. */
    private EnrollmentResponse createPendingFromPaidInvoice(Long invoiceId) {
        Invoice invoice = getInvoice(invoiceId);
        validatePaidTuitionInvoice(invoice);
        Course course = getCourse(invoice.getCourseId());
        return course.getCourseType() == CourseType.OFFLINE
                ? createOfflineFromPaidInvoice(invoiceId)
                : createOnlineFromPaidInvoice(invoiceId);
    }

    private EnrollmentResponse createOfflineFromPaidInvoice(Long invoiceId) {
        Invoice invoice = getInvoice(invoiceId);
        validatePaidTuitionInvoice(invoice);
        Course course = lockAndGetCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Hóa đơn này không thuộc khóa OFFLINE");
        }
        Enrollment existing = enrollmentRepository.findByInvoiceId(invoiceId).orElse(null);
        if (existing != null) {
            // Enrollment cũ có thể được tạo trước khi tính năng cấp tài khoản ra đời:
            // vẫn đảm bảo học viên có tài khoản để email thanh toán gửi được thông tin đăng
            // nhập.
            ensureAccountForExistingEnrollment(existing, invoice);
            return response(existing);
        }
        Long studentId = ensureOfflineStudentProfile(invoice);
        if (invoice.getStudentId() == null) {
            invoice.setStudentId(studentId);
        }
        invoiceRepository.save(invoice);
        if (enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                course.getId(), studentId, EnrollmentStatus.TERMINATED)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Học viên đã có ghi danh trong khóa học này");
        }
        Long actorId = invoice.getConfirmedBy() != null ? invoice.getConfirmedBy() : invoice.getCreatedBy();
        return createEnrollment(invoice, course,
                course.getStartDate() != null && !course.getStartDate().isAfter(LocalDate.now())
                        ? EnrollmentStatus.ACTIVE
                        : EnrollmentStatus.PENDING,
                actorId, studentId);
    }

    /**
     * Ghi danh OFFLINE bắt buộc phải có hồ sơ học viên.
     * Nếu hóa đơn đã thanh toán nhưng mới chỉ liên kết Lead, hệ thống tự chuyển
     * Lead sang
     * Student (idempotent) rồi gắn studentId vào hóa đơn để hoàn tất ghi danh.
     */
    private Long ensureOfflineStudentProfile(Invoice invoice) {
        if (invoice.getStudentId() != null) {
            StudentResponse student = studentService.ensureAccountForPayment(invoice.getStudentId());
            return student.getId();
        }
        if (invoice.getLeadId() == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Hóa đơn OFFLINE phải liên kết với hồ sơ học viên hoặc Lead mới");
        }
        StudentConvertFromLeadRequest request = new StudentConvertFromLeadRequest();
        request.setLeadId(invoice.getLeadId());
        request.setCourseId(invoice.getCourseId());
        request.setNote("Tự động tạo hồ sơ học viên khi ghi danh từ hóa đơn " + invoice.getInvoiceCode());
        Long actorId = invoice.getConfirmedBy() != null ? invoice.getConfirmedBy() : invoice.getCreatedBy();
        StudentResponse student = studentService.convertFromLeadForPayment(request, actorId);
        return student.getId();
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EnrollmentResponse createOnlineFromPaidInvoice(Long invoiceId) {
        Invoice invoice = getInvoice(invoiceId);
        validatePaidTuitionInvoice(invoice);
        Enrollment existing = enrollmentRepository.findByInvoiceId(invoiceId).orElse(null);
        if (existing != null) {
            // Enrollment cũ có thể được tạo trước khi tính năng cấp tài khoản ra đời:
            // vẫn đảm bảo học viên có tài khoản để email thanh toán gửi được thông tin đăng
            // nhập.
            ensureAccountForExistingEnrollment(existing, invoice);
            progressCalculationService.recalculateForEnrollment(existing.getId(), existing.getCourseId());
            return response(existing);
        }
        Course course = lockAndGetCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.ONLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Hóa đơn này không thuộc khóa ONLINE");
        }
        Long actorId = invoice.getConfirmedBy() != null ? invoice.getConfirmedBy() : invoice.getCreatedBy();
        Long studentId = ensureOnlineStudentProfile(invoice, actorId);
        EnrollmentResponse enrollment = createEnrollment(
                invoice, course, EnrollmentStatus.ACTIVE, actorId, studentId);
        progressCalculationService.recalculateForEnrollment(enrollment.enrollmentId(), course.getId());
        return enrollment;
    }

    /**
     * Ghi danh ONLINE bắt buộc phải có hồ sơ học viên và tài khoản người học.
     * Khách mua khóa học chưa có tài khoản: Lead được chuyển thành Student và cấp
     * tài khoản
     * ngay tại thời điểm thanh toán (idempotent). Mật khẩu tạm được gửi kèm email
     * hóa đơn.
     */
    private Long ensureOnlineStudentProfile(Invoice invoice, Long actorId) {
        if (invoice.getStudentId() != null) {
            Student student = studentRepository.findById(invoice.getStudentId()).orElse(null);
            if (student != null) {
                studentService.ensureAccountForPayment(student.getId());
                return student.getId();
            }
        }

        Long leadId = invoice.getLeadId();
        if (leadId == null) {
            leadId = ensureLeadForInvoice(invoice);
        }
        if (leadId == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Hóa đơn ONLINE phải liên kết với hồ sơ học viên hoặc khách hàng");
        }

        StudentConvertFromLeadRequest request = new StudentConvertFromLeadRequest();
        request.setLeadId(leadId);
        request.setCourseId(invoice.getCourseId());
        request.setNote("Tự động tạo hồ sơ học viên khi thanh toán hóa đơn " + invoice.getInvoiceCode());
        StudentResponse student = studentService.convertFromLeadForPayment(request, actorId);

        invoice.setStudentId(student.getId());
        invoiceRepository.save(invoice);
        return student.getId();
    }

    /**
     * Hóa đơn của tài khoản đã đăng nhập nhưng chưa có hồ sơ học viên: tạo lead
     * tương ứng.
     * Với hóa đơn đã gắn tài khoản, hồ sơ học viên phải đi theo tài khoản đăng
     * nhập; email/người mua
     * trên hóa đơn chỉ là thông tin liên hệ và có thể khác email đăng nhập.
     */
    private Long ensureLeadForInvoice(Invoice invoice) {
        String email = invoice.getPayerEmail();
        String name = invoice.getPayerName();
        String phone = invoice.getPayerPhone();
        if (email == null || email.isBlank()) {
            return null;
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        Lead lead = leadRepository.findFirstByEmailOrderByCreatedAtDesc(normalizedEmail).orElse(null);
        if (lead == null) {
            lead = new Lead();
            lead.setFullName(name != null && !name.isBlank() ? name.trim() : normalizedEmail);
            lead.setEmail(normalizedEmail);
            lead.setPhone(phone != null && !phone.isBlank() ? phone.trim() : "0000000000");
            lead.setCourseId(invoice.getCourseId());
            lead.setStatus("CONSULTED");
            lead.setConsultedAt(LocalDateTime.now());
            lead.setSourceName("Website");
            lead.setChannelType("ONLINE");
            lead.setNote("Tự động tạo khi thanh toán hóa đơn " + invoice.getInvoiceCode());
            lead = leadRepository.save(lead);
        }
        invoice.setLeadId(lead.getId());
        invoiceRepository.save(invoice);
        return lead.getId();
    }

    private Long studentAccountId(Long studentId) {
        if (studentId == null)
            return null;
        return studentRepository.findById(studentId).map(Student::getUserId).orElse(null);
    }

    /**
     * Đảm bảo enrollment đã tồn tại cũng có tài khoản học viên.
     * Chỉ cấp tài khoản mới khi student chưa được liên kết; nếu đã có thì giữ
     * nguyên.
     */
    private void ensureAccountForExistingEnrollment(Enrollment enrollment, Invoice invoice) {
        if (enrollment.getStudentId() == null) {
            return;
        }
        StudentResponse provisioned = studentService.ensureAccountForPayment(enrollment.getStudentId());
        if (invoice.getStudentId() == null) {
            invoice.setStudentId(provisioned.getId());
            invoiceRepository.save(invoice);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PendingEnrollmentCandidateResponse> searchPendingCandidates(
            Long courseId, CourseType courseType, String search, Pageable pageable) {
        requireAdmin();
        if (courseId != null) {
            Course course = getCourse(courseId);
            if (courseType != null && course.getCourseType() != courseType) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Khóa học không thuộc hình thức đã chọn");
            }
        }

        // Truyền chuỗi rỗng thay vì null: tránh PostgreSQL không suy luận được kiểu
        // tham số
        // trong "LOWER(CONCAT('%', :search, '%'))" và báo lỗi "function lower(bytea)
        // does not exist".
        String searchTerm = search == null || search.isBlank() ? "" : search.trim();
        Page<Invoice> invoices = invoiceRepository.findPaidEnrollmentCandidates(
                courseId, InvoiceType.TUITION_PAYMENT, InvoiceStatus.PAID,
                searchTerm, courseType, pageable);
        Set<Long> leadIds = invoices.stream().map(Invoice::getLeadId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> studentIds = invoices.stream().map(Invoice::getStudentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> courseIds = invoices.stream().map(Invoice::getCourseId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Lead> leads = leadRepository.findAllById(leadIds).stream()
                .collect(Collectors.toMap(Lead::getId, lead -> lead));
        leads.values().stream().map(Lead::getStudentId).filter(Objects::nonNull).forEach(studentIds::add);
        List<Student> studentRows = new ArrayList<>(studentRepository.findAllById(studentIds));
        Map<Long, Student> students = studentRows.stream()
                .collect(Collectors.toMap(Student::getId, student -> student, (first, ignored) -> first));
        Set<Long> accountIds = studentRows.stream().map(Student::getUserId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Account> accounts = accountRepository.findAllById(accountIds).stream()
                .collect(Collectors.toMap(Account::getId, account -> account));
        Map<Long, Course> courses = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, course -> course));

        return invoices.map(invoice -> {
            Course course = courses.get(invoice.getCourseId());
            Student student = invoice.getStudentId() != null ? students.get(invoice.getStudentId()) : null;
            Lead lead = invoice.getLeadId() != null ? leads.get(invoice.getLeadId()) : null;
            if (student == null && lead != null && lead.getStudentId() != null) {
                student = students.get(lead.getStudentId());
            }
            Account account = student != null && student.getUserId() != null
                    ? accounts.get(student.getUserId())
                    : null;
            UserProfile profile = account != null ? account.getUserProfile() : null;
            return new PendingEnrollmentCandidateResponse(
                    invoice.getCourseId(), course != null ? course.getCourseType() : null,
                    course != null ? course.getTitle() : null,
                    course != null ? course.getStartDate() : null,
                    invoice.getId(), invoice.getInvoiceCode(), invoice.getPaidAt(), invoice.getAmount(),
                    student != null ? student.getId() : null,
                    student != null ? student.getStudentCode() : null,
                    student != null ? student.getFullName()
                            : lead != null ? lead.getFullName()
                                    : profile != null ? profile.getFullName() : invoice.getPayerName(),
                    student != null ? student.getEmail()
                            : lead != null ? lead.getEmail()
                                    : account != null ? account.getEmail() : invoice.getPayerEmail(),
                    student != null ? student.getPhone()
                            : lead != null ? lead.getPhone()
                                    : profile != null ? profile.getPhone() : invoice.getPayerPhone(),
                    student != null, lead != null);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EnrollmentResponse> search(EnrollmentType type, EnrollmentStatus status, Long courseId,
            Long studentId, Long accountId, String search, boolean includeCompletionEligibility, Pageable pageable) {
        Long ownerAccountId = null;
        Long ownerStudentId = null;
        if (!SecurityUtils.hasRole("ADMIN")) {
            Long currentAccountId = SecurityUtils.requireCurrentAccountId();
            if (!SecurityUtils.hasRole("STUDENT")) {
                throw new ErrorHandler(HttpStatus.FORBIDDEN, "Không có quyền tra cứu danh sách ghi danh");
            }
            ownerAccountId = currentAccountId;
            ownerStudentId = studentRepository.findByUserId(currentAccountId)
                    .map(Student::getId).orElse(-1L);
        }
        Page<Enrollment> page = enrollmentRepository.findAll(buildSearchSpecification(type, status, courseId,
                studentId, accountId, ownerAccountId, ownerStudentId, search), pageable);
        if (page.isEmpty()) {
            return page.map(e -> null);
        }

        Set<Long> studentIds = page.stream().map(Enrollment::getStudentId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> courseIds = page.stream().map(Enrollment::getCourseId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> invoiceIds = page.stream().map(Enrollment::getInvoiceId).filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, Student> studentMap = studentRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(Student::getId, s -> s));
        Set<Long> accountIds = studentMap.values().stream().map(Student::getUserId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Course> courseMap = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, c -> c));
        Map<Long, Invoice> invoiceMap = invoiceRepository.findAllById(invoiceIds).stream()
                .collect(Collectors.toMap(Invoice::getId, i -> i));
        Map<Long, Account> accountMap = accountRepository.findAllById(accountIds).stream()
                .collect(Collectors.toMap(Account::getId, a -> a));

        return page.map(e -> {
            Student s = e.getStudentId() != null ? studentMap.get(e.getStudentId()) : null;
            Account a = s != null && s.getUserId() != null ? accountMap.get(s.getUserId()) : null;
            Course c = e.getCourseId() != null ? courseMap.get(e.getCourseId()) : null;
            Invoice inv = e.getInvoiceId() != null ? invoiceMap.get(e.getInvoiceId()) : null;

            UserProfile profile = a != null ? a.getUserProfile() : null;
            String studentName = s != null ? s.getFullName()
                    : (profile != null ? profile.getFullName() : (a != null ? a.getEmail() : null));
            String studentCode = s != null ? s.getStudentCode() : null;
            String studentEmail = s != null ? s.getEmail() : (a != null ? a.getEmail() : null);
            String studentPhone = s != null ? s.getPhone() : (profile != null ? profile.getPhone() : null);
            String courseTitle = c != null ? c.getTitle() : null;
            String invoiceCode = inv != null ? inv.getInvoiceCode() : null;
            long absences = attendanceRepository.countByEnrollmentIdAndStatus(e.getId(), AttendanceStatus.ABSENT);
            CompletionEligibility eligibility = includeCompletionEligibility
                    ? evaluateCompletionEligibility(e, c)
                    : new CompletionEligibility(false, null);

            return EnrollmentResponse.from(e, enrollmentType(c), a != null ? a.getId() : null,
                    absences, studentName, studentCode, studentEmail, studentPhone,
                    courseTitle, invoiceCode, eligibility.eligible(), eligibility.reason());
        });
    }

    private EnrollmentType enrollmentType(Course course) {
        return course != null ? EnrollmentType.valueOf(course.getCourseType().name()) : null;
    }

    @Override
    @Transactional(readOnly = true)
    public EnrollmentSummaryResponse getSummary() {
        requireAdmin();
        Map<EnrollmentStatus, Long> counts = new EnumMap<>(EnrollmentStatus.class);
        for (EnrollmentStatus status : EnrollmentStatus.values())
            counts.put(status, 0L);
        enrollmentRepository.countGroupedByStatus()
                .forEach(row -> counts.put((EnrollmentStatus) row[0], ((Number) row[1]).longValue()));
        long awaitingEnrollment = invoiceRepository.findPaidEnrollmentCandidates(
                null, InvoiceType.TUITION_PAYMENT, InvoiceStatus.PAID, null, null,
                PageRequest.of(0, 1)).getTotalElements();
        return new EnrollmentSummaryResponse(
                counts.get(EnrollmentStatus.PENDING), counts.get(EnrollmentStatus.ACTIVE),
                counts.get(EnrollmentStatus.RESERVED), counts.get(EnrollmentStatus.TERMINATED),
                counts.get(EnrollmentStatus.COMPLETED), awaitingEnrollment);
    }

    @Override
    @Transactional(readOnly = true)
    public EnrollmentResponse getById(Long enrollmentId) {
        Enrollment enrollment = getEnrollment(enrollmentId);
        requireCanView(enrollment);
        return enrich(enrollment);
    }

    @Override
    @Transactional
    public EnrollmentResponse reserve(Long enrollmentId, ReserveEnrollmentRequest request) {
        requireAdmin();
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        requireOffline(enrollment);
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ bảo lưu ghi danh đang ACTIVE");
        }
        boolean alreadyReserved = statusLogRepository.findByEnrollmentIdOrderByChangedAtDesc(enrollmentId)
                .stream().anyMatch(log -> log.getNewStatus() == EnrollmentStatus.RESERVED);
        if (alreadyReserved) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Mỗi học viên chỉ được bảo lưu một lần cho mỗi khóa");
        }
        LocalDate today = LocalDate.now();
        if (request.getStartDate().isBefore(today)
                || request.getEndDate().isBefore(request.getStartDate())
                || request.getEndDate().isAfter(request.getStartDate().plusMonths(3))) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Thời gian bảo lưu phải hợp lệ và không vượt quá 03 tháng");
        }
        enrollment.setHoldReason(request.getReason().trim());
        enrollment.setHoldStartDate(request.getStartDate());
        enrollment.setHoldEndDate(request.getEndDate());
        enrollment.setHoldProcessedBy(SecurityUtils.requireCurrentAccountId());
        return changeStatus(enrollment, EnrollmentStatus.RESERVED, request.getReason());
    }

    @Override
    @Transactional
    public EnrollmentResponse resume(Long enrollmentId) {
        requireAdmin();
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        requireOffline(enrollment);
        if (enrollment.getStatus() != EnrollmentStatus.RESERVED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ ghi danh RESERVED mới được quay lại học");
        }
        Course course = lockAndGetCourse(enrollment.getCourseId());
        ensureSeatAvailable(course);
        enrollment.setActualReturnDate(LocalDate.now());
        enrollment.setHoldProcessedBy(SecurityUtils.requireCurrentAccountId());
        return changeStatus(enrollment, EnrollmentStatus.ACTIVE, "Học viên quay lại sau bảo lưu");
    }

    @Override
    @Transactional
    public EnrollmentResponse terminate(Long enrollmentId, TerminateEnrollmentRequest request) {
        requireAdmin();
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        if (enrollment.getStatus() == EnrollmentStatus.TERMINATED
                || enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Ghi danh đã kết thúc vòng đời");
        }
        enrollment.setTerminationReason(request.getReason().trim());
        enrollment.setTerminatedAt(LocalDateTime.now());
        enrollment.setTerminatedBy(SecurityUtils.requireCurrentAccountId());
        return changeStatus(enrollment, EnrollmentStatus.TERMINATED, request.getReason());
    }

    @Override
    @Transactional
    public void terminateForFullRefund(Long invoiceId, Long actorId, String reason) {
        Enrollment enrollment = enrollmentRepository.findByInvoiceId(invoiceId).orElse(null);
        if (enrollment == null) {
            return;
        }
        // Ghi danh đã kết thúc vòng đời thì giữ nguyên lịch sử, không ghi đè trạng
        // thái.
        if (enrollment.getStatus() == EnrollmentStatus.TERMINATED
                || enrollment.getStatus() == EnrollmentStatus.COMPLETED) {
            return;
        }
        EnrollmentStatus oldStatus = enrollment.getStatus();
        enrollment.setStatus(EnrollmentStatus.TERMINATED);
        enrollment.setTerminationReason(reason);
        enrollment.setTerminatedAt(LocalDateTime.now());
        enrollment.setTerminatedBy(actorId);
        enrollment.setUpdatedAt(LocalDateTime.now());
        enrollment.setUpdatedBy(actorId);
        Enrollment saved = enrollmentRepository.save(enrollment);
        saveStatusLog(saved.getId(), oldStatus, EnrollmentStatus.TERMINATED, reason, actorId);
    }

    @Override
    @Transactional
    public EnrollmentResponse recordFinalScore(Long enrollmentId, RecordFinalScoreRequest request) {
        requireAdmin();
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        requireOffline(enrollment);
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ ghi điểm cho ghi danh ACTIVE");
        }
        enrollment.setFinalScore(request.getFinalScore());
        enrollment.setScoreRecordedAt(LocalDateTime.now());
        enrollment.setScoreRecordedBy(SecurityUtils.requireCurrentAccountId());
        touch(enrollment);
        return saveResponse(enrollment);
    }

    @Override
    @Transactional
    public EnrollmentResponse complete(Long enrollmentId) {
        requireAdmin();
        return completeEnrollment(enrollmentId, null);
    }

    @Override
    public EnrollmentBatchActionResponse completeBatch(Long courseId, List<Long> enrollmentIds) {
        requireAdmin();
        if (courseId == null || enrollmentIds == null || enrollmentIds.isEmpty() || enrollmentIds.size() > 100) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mỗi lần cần chọn từ 1 đến 100 học viên trong một khóa");
        }

        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        List<EnrollmentBatchActionResponse.Item> results = new ArrayList<>();
        Set<Long> uniqueEnrollmentIds = new LinkedHashSet<>(enrollmentIds);
        int completed = 0;
        for (Long enrollmentId : uniqueEnrollmentIds) {
            try {
                transaction.execute(status -> completeEnrollment(enrollmentId, courseId));
                results.add(new EnrollmentBatchActionResponse.Item(enrollmentId, true, "Đã hoàn thành"));
                completed++;
            } catch (Exception ex) {
                results.add(new EnrollmentBatchActionResponse.Item(enrollmentId, false,
                        ex.getMessage() != null ? ex.getMessage() : "Không thể hoàn thành"));
            }
        }
        return new EnrollmentBatchActionResponse(completed, results.size() - completed, results);
    }

    private EnrollmentResponse completeEnrollment(Long enrollmentId, Long expectedCourseId) {
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        if (expectedCourseId != null && !expectedCourseId.equals(enrollment.getCourseId())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Ghi danh không thuộc khóa học đã chọn");
        }
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ ghi danh ACTIVE mới được xét hoàn thành");
        }
        Course course = courseRepository.findById(enrollment.getCourseId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        if (course.getStatus() != CourseStatus.FINISHED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ xét hoàn thành sau khi khóa học kết thúc");
        }
        if (course.getCourseType() == CourseType.OFFLINE) {
            // Eligibility thresholds for absences and scores are intentionally deferred.
            if (enrollment.getFinalScore() == null) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Cần ghi nhận điểm cuối khóa trước khi xét hoàn thành");
            }
        } else {
            validateOnlineCompletion(enrollment, course);
        }
        enrollment.setCompletedAt(LocalDateTime.now());
        enrollment.setCompletedBy(SecurityUtils.requireCurrentAccountId());
        return changeStatus(enrollment, EnrollmentStatus.COMPLETED, "Đủ điều kiện hoàn thành khóa học");
    }

    @Override
    @Transactional
    public SessionAttendanceResponse getSessionAttendance(Long courseId, Long sessionId) {
        Session session = getSession(courseId, sessionId);
        requireCanManageSession(session);
        if (session.getCourse().getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Điểm danh chỉ áp dụng cho khóa OFFLINE");
        }
        List<AttendanceRecord> existing = attendanceRepository.findBySessionIdOrderByEnrollmentIdAsc(sessionId);
        Set<Long> existingEnrollmentIds = existing.stream().map(AttendanceRecord::getEnrollmentId)
                .collect(Collectors.toSet());
        Long actorId = SecurityUtils.requireCurrentAccountId();
        List<AttendanceRecord> missing = enrollmentRepository
                .findByCourseIdAndStatus(courseId, EnrollmentStatus.ACTIVE).stream()
                .filter(enrollment -> enrollment.getEnrolledAt() == null
                        || !enrollment.getEnrolledAt().isAfter(session.getEndTime()))
                .filter(enrollment -> !isEnrollmentOnHoldForSession(enrollment, session))
                .filter(enrollment -> !existingEnrollmentIds.contains(enrollment.getId()))
                .map(enrollment -> newAttendanceRecord(enrollment.getId(), sessionId, actorId))
                .toList();
        if (!missing.isEmpty())
            attendanceRepository.saveAll(missing);
        return sessionAttendanceResponse(courseId, sessionId);
    }

    @Override
    @Transactional
    public SessionAttendanceResponse saveSessionAttendance(
            Long courseId, Long sessionId, SaveSessionAttendanceRequest request) {
        Session session = getSession(courseId, sessionId);
        requireCanManageSession(session);
        if (session.getCourse().getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Điểm danh chỉ áp dụng cho khóa OFFLINE");
        }
        List<Enrollment> activeEnrollments = enrollmentRepository.findByCourseIdAndStatus(
                courseId, EnrollmentStatus.ACTIVE);
        Set<Long> allowedIds = activeEnrollments.stream().map(Enrollment::getId).collect(Collectors.toSet());
        List<AttendanceRecord> existingRecords = attendanceRepository.findBySessionIdOrderByEnrollmentIdAsc(sessionId);
        existingRecords.forEach(record -> allowedIds.add(record.getEnrollmentId()));
        Set<Long> submittedIds = new HashSet<>();
        if (request.getRecords() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Danh sách điểm danh không được để trống");
        }
        Long actorId = SecurityUtils.requireCurrentAccountId();
        Map<Long, AttendanceRecord> recordsByEnrollment = existingRecords.stream()
                .collect(Collectors.toMap(AttendanceRecord::getEnrollmentId, record -> record));
        LocalDateTime now = LocalDateTime.now();
        for (SaveSessionAttendanceRequest.Record submitted : request.getRecords()) {
            Long enrollmentId = submitted.getEnrollmentId();
            if (enrollmentId == null || !allowedIds.contains(enrollmentId)
                    || !submittedIds.add(enrollmentId) || submitted.getStatus() == null) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Mỗi học viên phải có một trạng thái điểm danh hợp lệ trong khóa này");
            }
            AttendanceRecord record = recordsByEnrollment.computeIfAbsent(enrollmentId,
                    id -> newAttendanceRecord(id, sessionId, actorId));
            AttendanceStatus status = submitted.getStatus();
            if (submitted.getCheckInAt() != null) {
                if (status != AttendanceStatus.PRESENT && status != AttendanceStatus.LATE) {
                    throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                            "Chỉ trạng thái có mặt mới được nhập giờ đến lớp");
                }
                status = submitted.getCheckInAt().isAfter(
                        session.getStartTime().plusMinutes(ATTENDANCE_LATE_GRACE_MINUTES))
                                ? AttendanceStatus.LATE
                                : AttendanceStatus.PRESENT;
            }
            record.setStatus(status);
            record.setCheckInAt(submitted.getCheckInAt());
            record.setNote(submitted.getNote() == null || submitted.getNote().isBlank()
                    ? null
                    : submitted.getNote().trim());
            record.setUpdatedAt(now);
            record.setUpdatedBy(actorId);
            if (status == AttendanceStatus.NOT_MARKED) {
                record.setMarkedAt(null);
                record.setMarkedBy(null);
            } else {
                record.setMarkedAt(now);
                record.setMarkedBy(actorId);
            }
        }
        attendanceRepository.saveAll(recordsByEnrollment.values());
        return sessionAttendanceResponse(courseId, sessionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceRecordResponse> getAttendanceHistory(Long enrollmentId) {
        Enrollment enrollment = getEnrollment(enrollmentId);
        requireCanView(enrollment);
        List<AttendanceRecord> records = attendanceRepository.findByEnrollmentIdOrderByCreatedAtDesc(enrollmentId);
        return attendanceResponses(records);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentStatusLogResponse> getStatusHistory(Long enrollmentId) {
        Enrollment enrollment = getEnrollment(enrollmentId);
        requireCanView(enrollment);
        return statusLogRepository.findByEnrollmentIdOrderByChangedAtDesc(enrollmentId).stream()
                .map(EnrollmentStatusLogResponse::from).toList();
    }

    private AttendanceRecord newAttendanceRecord(Long enrollmentId, Long sessionId, Long createdBy) {
        AttendanceRecord record = new AttendanceRecord();
        record.setEnrollmentId(enrollmentId);
        record.setSessionId(sessionId);
        record.setStatus(AttendanceStatus.NOT_MARKED);
        record.setCreatedBy(createdBy);
        return record;
    }

    private boolean isEnrollmentOnHoldForSession(Enrollment enrollment, Session session) {
        LocalDate sessionDate = session.getSessionDate();
        return sessionDate != null && enrollment.getHoldStartDate() != null
                && enrollment.getHoldEndDate() != null
                && !sessionDate.isBefore(enrollment.getHoldStartDate())
                && !sessionDate.isAfter(enrollment.getHoldEndDate());
    }

    private SessionAttendanceResponse sessionAttendanceResponse(Long courseId, Long sessionId) {
        return new SessionAttendanceResponse(courseId, sessionId,
                attendanceResponses(attendanceRepository.findBySessionIdOrderByEnrollmentIdAsc(sessionId)));
    }

    private List<AttendanceRecordResponse> attendanceResponses(List<AttendanceRecord> records) {
        if (records.isEmpty())
            return List.of();
        Set<Long> enrollmentIds = records.stream().map(AttendanceRecord::getEnrollmentId)
                .collect(Collectors.toSet());
        Map<Long, Enrollment> enrollmentMap = enrollmentRepository.findAllById(enrollmentIds).stream()
                .collect(Collectors.toMap(Enrollment::getId, enrollment -> enrollment));
        Set<Long> studentIds = enrollmentMap.values().stream().map(Enrollment::getStudentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Student> studentMap = studentRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(Student::getId, student -> student));
        Set<Long> sessionIds = records.stream().map(AttendanceRecord::getSessionId)
                .collect(Collectors.toSet());
        Map<Long, Session> sessionMap = sessionRepository.findAllById(sessionIds).stream()
                .collect(Collectors.toMap(Session::getId, session -> session));
        return records.stream().map(record -> {
            Enrollment enrollment = enrollmentMap.get(record.getEnrollmentId());
            Student student = enrollment == null ? null : studentMap.get(enrollment.getStudentId());
            return AttendanceRecordResponse.from(record, sessionMap.get(record.getSessionId()), student);
        }).toList();
    }

    private EnrollmentResponse createEnrollment(Invoice invoice, Course course,
            EnrollmentStatus status, Long actorId, Long studentId) {
        if (enrollmentRepository.existsByInvoiceId(invoice.getId())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn này đã được ghi danh");
        }
        if (studentId == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Ghi danh phải liên kết với hồ sơ học viên");
        }
        ensureCourseCanEnroll(course);
        ensureSeatAvailable(course);
        Enrollment enrollment = new Enrollment();
        enrollment.setStudentId(studentId);
        enrollment.setCourseId(course.getId());
        enrollment.setInvoiceId(invoice.getId());
        // Guest checkouts have no staff actor; fall back to the provisioned student
        // account
        // because enrolled_by is a required FK.
        if (actorId == null) {
            actorId = studentAccountId(studentId);
        }
        if (actorId == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Không xác định được người thực hiện ghi danh cho hóa đơn " + invoice.getInvoiceCode());
        }
        enrollment.setEnrolledBy(actorId);
        enrollment.setStatus(status);
        Enrollment saved = enrollmentRepository.save(enrollment);
        saveStatusLog(saved.getId(), null, status, "Tạo ghi danh từ hóa đơn đã thanh toán", actorId);
        return response(saved);
    }

    private void validateOnlineCompletion(Enrollment enrollment, Course course) {
        Progress progress = progressRepository.findByEnrollment_IdAndCourse_IdAndProgressTypeAndReferenceId(
                enrollment.getId(), course.getId(), ProgressScope.COURSE, null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.CONFLICT, "Chưa có tiến độ khóa học"));
        if (progress.getProgressPercentage() == null
                || progress.getProgressPercentage().compareTo(BigDecimal.valueOf(100)) < 0
                || Boolean.TRUE.equals(progress.getHasUncompletedNewContent())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Cần hoàn thành 100% nội dung khóa học trước");
        }
        List<CourseResource> requiredQuizzes = courseResourceRepository.findByCourse_IdAndIsRequiredTrue(course.getId())
                .stream().filter(resource -> resource.getResourceType() == ResourceType.QUIZ).toList();
        for (CourseResource quiz : requiredQuizzes) {
            Number passed = (Number) entityManager.createNativeQuery("""
                    SELECT COUNT(*) FROM quiz_attempt
                    WHERE course_id = :courseId AND resource_id = :resourceId
                      AND enrollment_id = :enrollmentId AND is_passed = TRUE
                    """)
                    .setParameter("courseId", course.getId())
                    .setParameter("resourceId", quiz.getId())
                    .setParameter("enrollmentId", enrollment.getId())
                    .getSingleResult();
            if (passed.longValue() == 0) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Học viên chưa vượt qua bài kiểm tra bắt buộc: " + quiz.getTitle());
            }
        }
    }

    private CompletionEligibility evaluateCompletionEligibility(Enrollment enrollment, Course course) {
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            return new CompletionEligibility(false, "Chỉ ghi danh ACTIVE mới được xét hoàn thành");
        }
        if (course == null) {
            return new CompletionEligibility(false, "Không tìm thấy khóa học");
        }
        if (course.getStatus() != CourseStatus.FINISHED) {
            return new CompletionEligibility(false, "Chỉ xét hoàn thành sau khi khóa học kết thúc");
        }
        if (course.getCourseType() == CourseType.OFFLINE && enrollment.getFinalScore() == null) {
            return new CompletionEligibility(false, "Cần ghi nhận điểm cuối khóa trước");
        }
        if (course.getCourseType() == CourseType.ONLINE) {
            try {
                validateOnlineCompletion(enrollment, course);
            } catch (ErrorHandler ex) {
                return new CompletionEligibility(false, ex.getMessage());
            }
        }
        return new CompletionEligibility(true, null);
    }

    private record CompletionEligibility(boolean eligible, String reason) {
    }

    private EnrollmentResponse changeStatus(Enrollment enrollment, EnrollmentStatus newStatus, String reason) {
        EnrollmentStatus oldStatus = enrollment.getStatus();
        if (oldStatus == newStatus) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Ghi danh đã ở trạng thái này");
        }
        enrollment.setStatus(newStatus);
        touch(enrollment);
        Enrollment saved = enrollmentRepository.save(enrollment);
        saveStatusLog(saved.getId(), oldStatus, newStatus, reason, SecurityUtils.requireCurrentAccountId());
        return response(saved);
    }

    private void saveStatusLog(Long enrollmentId, EnrollmentStatus oldStatus, EnrollmentStatus newStatus,
            String reason, Long changedBy) {
        EnrollmentStatusLog log = new EnrollmentStatusLog();
        log.setEnrollmentId(enrollmentId);
        log.setOldStatus(oldStatus);
        log.setNewStatus(newStatus);
        log.setReason(reason);
        log.setChangedBy(changedBy);
        statusLogRepository.save(log);
    }

    private Specification<Enrollment> buildSearchSpecification(EnrollmentType type, EnrollmentStatus status,
            Long courseId, Long studentId, Long accountId, Long ownerAccountId, Long ownerStudentId, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (type != null) {
                Subquery<Long> courseTypeMatch = query.subquery(Long.class);
                Root<Course> course = courseTypeMatch.from(Course.class);
                courseTypeMatch.select(course.get("id"))
                        .where(cb.equal(course.get("courseType"), CourseType.valueOf(type.name())));
                predicates.add(root.get("courseId").in(courseTypeMatch));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (courseId != null) {
                predicates.add(cb.equal(root.get("courseId"), courseId));
            }
            if (studentId != null) {
                predicates.add(cb.equal(root.get("studentId"), studentId));
            }
            if (accountId != null) {
                Subquery<Long> accountStudentMatch = query.subquery(Long.class);
                Root<Student> accountStudent = accountStudentMatch.from(Student.class);
                accountStudentMatch.select(accountStudent.get("id"))
                        .where(cb.equal(accountStudent.get("userId"), accountId));
                predicates.add(root.get("studentId").in(accountStudentMatch));
            }
            if (ownerAccountId != null) {
                predicates.add(cb.equal(root.get("studentId"), ownerStudentId));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                Subquery<Long> studentMatch = query.subquery(Long.class);
                Root<Student> student = studentMatch.from(Student.class);
                studentMatch.select(student.get("id")).where(cb.and(
                        cb.equal(student.get("id"), root.get("studentId")),
                        cb.or(cb.like(cb.lower(student.get("fullName")), pattern),
                                cb.like(cb.lower(student.get("studentCode")), pattern),
                                cb.like(cb.lower(student.get("email")), pattern),
                                cb.like(cb.lower(student.get("phone")), pattern))));

                Subquery<Long> courseMatch = query.subquery(Long.class);
                Root<Course> course = courseMatch.from(Course.class);
                courseMatch.select(course.get("id")).where(cb.and(
                        cb.equal(course.get("id"), root.get("courseId")),
                        cb.or(cb.like(cb.lower(course.get("title")), pattern),
                                cb.like(cb.lower(course.get("code")), pattern),
                                cb.like(cb.lower(course.get("displayCode")), pattern))));

                Subquery<Long> invoiceMatch = query.subquery(Long.class);
                Root<Invoice> invoice = invoiceMatch.from(Invoice.class);
                invoiceMatch.select(invoice.get("id")).where(cb.and(
                        cb.equal(invoice.get("id"), root.get("invoiceId")),
                        cb.like(cb.lower(invoice.get("invoiceCode")), pattern)));

                predicates.add(cb.or(cb.exists(studentMatch),
                        cb.exists(courseMatch), cb.exists(invoiceMatch)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void touch(Enrollment enrollment) {
        enrollment.setUpdatedAt(LocalDateTime.now());
        enrollment.setUpdatedBy(SecurityUtils.requireCurrentAccountId());
    }

    private EnrollmentResponse saveResponse(Enrollment enrollment) {
        return response(enrollmentRepository.save(enrollment));
    }

    private EnrollmentResponse response(Enrollment enrollment) {
        return enrich(enrollment);
    }

    private EnrollmentResponse enrich(Enrollment e) {
        Student s = e.getStudentId() != null ? studentRepository.findById(e.getStudentId()).orElse(null) : null;
        Long accountId = s != null ? s.getUserId() : null;
        Account a = accountId != null ? accountRepository.findById(accountId).orElse(null) : null;
        Course c = e.getCourseId() != null ? courseRepository.findById(e.getCourseId()).orElse(null) : null;
        Invoice inv = e.getInvoiceId() != null ? invoiceRepository.findById(e.getInvoiceId()).orElse(null) : null;

        UserProfile profile = a != null ? a.getUserProfile() : null;
        String studentName = s != null ? s.getFullName()
                : (profile != null ? profile.getFullName() : (a != null ? a.getEmail() : null));
        String studentCode = s != null ? s.getStudentCode() : null;
        String studentEmail = s != null ? s.getEmail() : (a != null ? a.getEmail() : null);
        String studentPhone = s != null ? s.getPhone() : (profile != null ? profile.getPhone() : null);
        String courseTitle = c != null ? c.getTitle() : null;
        String invoiceCode = inv != null ? inv.getInvoiceCode() : null;
        long absences = attendanceRepository.countByEnrollmentIdAndStatus(e.getId(), AttendanceStatus.ABSENT);

        return EnrollmentResponse.from(e, enrollmentType(c), accountId, absences,
                studentName, studentCode, studentEmail, studentPhone, courseTitle, invoiceCode);
    }

    private Invoice getInvoice(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Hóa đơn không tồn tại"));
    }

    private Course lockAndGetCourse(Long courseId) {
        entityManager.createNativeQuery("SELECT id FROM course WHERE id = :courseId FOR UPDATE")
                .setParameter("courseId", courseId).getSingleResult();
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
    }

    private Course getCourse(Long courseId) {
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
    }

    private void ensureSeatAvailable(Course course) {
        // Khóa ONLINE không giới hạn sĩ số; maxStudents chỉ áp dụng cho lớp OFFLINE.
        if (course.getCourseType() == CourseType.ONLINE) {
            return;
        }
        Integer maximum = course.getMaxStudents();
        if (maximum == null || maximum <= 0)
            return;
        long enrolled = enrollmentRepository.countByCourseIdAndStatusIn(course.getId(), SEAT_HOLDING_STATUSES);
        long current = course.getCurrentStudents() == null ? 0 : course.getCurrentStudents();
        if (Math.max(enrolled, current) >= maximum) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa học đã đủ sĩ số");
        }
    }

    private void ensureCourseCanEnroll(Course course) {
        if (course.getStatus() == CourseStatus.CANCELLED || course.getStatus() == CourseStatus.ARCHIVED
                || course.getStatus() == CourseStatus.FINISHED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa học không còn nhận ghi danh");
        }
    }

    private void validatePaidTuitionInvoice(Invoice invoice) {
        if (invoice.getType() != InvoiceType.TUITION_PAYMENT || invoice.getStatus() != InvoiceStatus.PAID) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ ghi danh từ hóa đơn học phí đã thanh toán");
        }
    }

    private Enrollment getEnrollment(Long id) {
        return enrollmentRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Ghi danh không tồn tại"));
    }

    private Enrollment getEnrollmentForUpdate(Long id) {
        return enrollmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Ghi danh không tồn tại"));
    }

    private Session getSession(Long courseId, Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Buổi học không tồn tại"));
        if (!session.getCourse().getId().equals(courseId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Buổi học không thuộc khóa học này");
        }
        return session;
    }

    private void requireOffline(Enrollment enrollment) {
        Course course = enrollment.getCourseId() != null
                ? courseRepository.findById(enrollment.getCourseId()).orElse(null)
                : null;
        if (course == null || course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thao tác này chỉ áp dụng cho khóa OFFLINE");
        }
    }

    private void requireAdmin() {
        if (!SecurityUtils.hasRole("ADMIN")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Thao tác này chỉ dành cho nhân viên học vụ");
        }
    }

    private void requireCanView(Enrollment enrollment) {
        if (SecurityUtils.hasRole("ADMIN"))
            return;
        Long accountId = SecurityUtils.requireCurrentAccountId();
        boolean ownsAsStudent = enrollment.getStudentId() != null
                && studentRepository.findByUserId(accountId)
                        .map(student -> student.getId().equals(enrollment.getStudentId())).orElse(false);
        if (!ownsAsStudent) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền xem ghi danh này");
        }
    }

    private void requireCanManageSession(Session session) {
        if (SecurityUtils.hasRole("ADMIN"))
            return;
        Long accountId = SecurityUtils.requireCurrentAccountId();
        boolean assigned = session.getTeacher() != null && accountId.equals(session.getTeacher().getId())
                || session.getSubstituteTeacher() != null && accountId.equals(session.getSubstituteTeacher().getId())
                || session.getAssistant() != null && accountId.equals(session.getAssistant().getId());
        if (!assigned)
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không được phân công buổi học này");
    }
}
