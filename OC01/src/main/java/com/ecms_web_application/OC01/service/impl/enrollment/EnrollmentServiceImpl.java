package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.StudentConvertFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.CompleteEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.SaveSessionAttendanceRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.StudentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceAuditLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceMatrixResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceRecordResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentStatusLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentSummaryResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentBatchActionResponse;
import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.response.enrollment.GradeReviewStatusResponse;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.service.request.RequestService;
import com.ecms_web_application.OC01.dto.response.enrollment.SessionAttendanceResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.FinalScoreImportResponse;
import com.ecms_web_application.OC01.entity.*;
import com.ecms_web_application.OC01.entity.enums.*;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.CourseScoreScale;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import com.ecms_web_application.OC01.event.EnrollmentCreatedEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
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
    private static final List<EnrollmentStatus> SEAT_HOLDING_STATUSES = List.of(EnrollmentStatus.PENDING,
            EnrollmentStatus.ACTIVE);
    private static final String ATTENDANCE_AUDIT_ENTITY = "SESSION_ATTENDANCE";

    /** Giảng viên chỉ được sửa điểm danh trong bao nhiêu ngày sau khi buổi học kết thúc. */
    @Value("${app.attendance.edit-window-days:7}")
    private long attendanceEditWindowDays = 7;

    /** Tỉ lệ vắng tối đa (%) để được xét hoàn thành khóa OFFLINE. */
    @Value("${app.attendance.max-absence-percent:20}")
    private double attendanceMaxAbsencePercent = 20;

    private final EnrollmentRepository enrollmentRepository;
    private final AuditLogRepository auditLogRepository;
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
    private final ApplicationEventPublisher eventPublisher;
    private final RequestRepository requestRepository;
    private final RequestService requestService;


    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public EnrollmentResponse createOfflineAfterPayment(Long invoiceId) {
        return createOfflineFromPaidInvoice(invoiceId);
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
            Long leadId = ensureLeadForInvoice(invoice);
            if (leadId == null) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Hóa đơn OFFLINE phải liên kết với hồ sơ học viên hoặc Lead mới");
            }
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
    public Page<EnrollmentResponse> search(EnrollmentType type, EnrollmentStatus status, CompletionResult completionResult, Long courseId,
            Long studentId, Long accountId, String search, boolean includeCompletionEligibility, Pageable pageable) {
        Long ownerAccountId = null;
        Long ownerStudentId = null;
        Long ownerTeacherId = null;
        if (!SecurityUtils.hasRole("ADMIN")) {
            Long currentAccountId = SecurityUtils.requireCurrentAccountId();
            if (SecurityUtils.hasRole("INSTRUCTOR")) {
                // Giảng viên chỉ được xem ghi danh thuộc các khóa mình phụ trách.
                ownerTeacherId = currentAccountId;
            } else if (SecurityUtils.hasRole("STUDENT")) {
                ownerAccountId = currentAccountId;
                ownerStudentId = studentRepository.findByUserId(currentAccountId)
                        .map(Student::getId).orElse(-1L);
            } else {
                throw new ErrorHandler(HttpStatus.FORBIDDEN, "Không có quyền tra cứu danh sách ghi danh");
            }
        }
        Page<Enrollment> page = enrollmentRepository.findAll(buildSearchSpecification(type, status, completionResult, courseId,
                studentId, accountId, ownerAccountId, ownerStudentId, ownerTeacherId, search), pageable);
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
            String courseCode = c != null ? c.getCode() : null;
            String invoiceCode = inv != null ? inv.getInvoiceCode() : null;
            long absences = attendanceRepository.countByEnrollmentIdAndStatus(e.getId(), AttendanceStatus.ABSENT);
            CompletionEligibility eligibility = includeCompletionEligibility
                    ? evaluateCompletionEligibility(e, c)
                    : new CompletionEligibility(false, null);

            boolean hideScore = shouldHideScoreFromStudent(c);

            return EnrollmentResponse.from(e, enrollmentType(c), a != null ? a.getId() : null,
                    absences, studentName, studentCode, studentEmail, studentPhone,
                    courseTitle, courseCode, invoiceCode, eligibility.eligible(), eligibility.reason(),
                    hideScore);
        });
    }

    private EnrollmentType enrollmentType(Course course) {
        return course != null ? EnrollmentType.valueOf(course.getCourseType().name()) : null;
    }

    /** Điểm cuối khóa OFFLINE chỉ được công bố cho học viên sau khi bảng điểm được duyệt. */
    private boolean shouldHideScoreFromStudent(Course course) {
        return SecurityUtils.hasRole("STUDENT") && course != null
                && course.getCourseType() == CourseType.OFFLINE
                && !"APPROVED".equals(getGradeReviewStatus(course.getId()).status());
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
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        requireInstructorCourseManager(enrollment.getCourseId(), "Chỉ giảng viên phụ trách mới được nhập điểm cho khóa học này");
        requireOffline(enrollment);
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ ghi điểm cho ghi danh ACTIVE");
        }
        Course course = courseRepository.findById(enrollment.getCourseId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        requireGradeSheetEditable(course.getId(), "chỉnh sửa điểm cuối khóa");
        int maxScore = CourseScoreScale.maxFinalScore(course);
        BigDecimal finalScore = request.getFinalScore();
        if (finalScore.compareTo(BigDecimal.valueOf(maxScore)) > 0 || finalScore.stripTrailingZeros().scale() > 2) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Điểm phải từ 0 đến " + maxScore + " và tối đa 2 chữ số thập phân");
        }
        enrollment.setFinalScore(finalScore);
        enrollment.setScoreRecordedAt(LocalDateTime.now());
        enrollment.setScoreRecordedBy(SecurityUtils.requireCurrentAccountId());
        touch(enrollment);
        return saveResponse(enrollment);
    }

    @Override
    @Transactional
    public EnrollmentResponse complete(Long enrollmentId, CompleteEnrollmentRequest request) {
        return completeEnrollment(enrollmentId, null, request.result());
    }

    @Override
    @Transactional
    public EnrollmentBatchActionResponse completeBatch(Long courseId, List<Long> enrollmentIds, CompletionResult result) {
        if (courseId == null || enrollmentIds == null || enrollmentIds.isEmpty() || enrollmentIds.size() > 100) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mỗi lần cần chọn từ 1 đến 100 học viên trong một khóa");
        }
        requireInstructorCourseManager(courseId, "Chỉ giảng viên phụ trách mới được xét hoàn thành khóa học này");

        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        List<EnrollmentBatchActionResponse.Item> results = new ArrayList<>();
        Set<Long> uniqueEnrollmentIds = new LinkedHashSet<>(enrollmentIds);
        int completed = 0;
        for (Long enrollmentId : uniqueEnrollmentIds) {
            try {
                transaction.execute(status -> completeEnrollment(enrollmentId, courseId, result));
                results.add(new EnrollmentBatchActionResponse.Item(enrollmentId, true, "Đã hoàn thành"));
                completed++;
            } catch (Exception ex) {
                results.add(new EnrollmentBatchActionResponse.Item(enrollmentId, false,
                        ex.getMessage() != null ? ex.getMessage() : "Không thể hoàn thành"));
            }
        }
        return new EnrollmentBatchActionResponse(completed, results.size() - completed, results);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCourseRoster(Long courseId) {
        Course course = requireCourseManager(courseId,
                "Bạn không có quyền xuất danh sách học viên của khóa này");
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Bảng điểm chỉ áp dụng cho khóa OFFLINE");
        }

        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdOrderByEnrolledAtAscIdAsc(courseId);
        Set<Long> studentIds = enrollments.stream().map(Enrollment::getStudentId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Student> students = studentRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(Student::getId, student -> student));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Danh sach hoc vien");
            Row title = sheet.createRow(0);
            title.createCell(0).setCellValue("BẢNG ĐIỂM KHÓA HỌC");
            Row courseMeta = sheet.createRow(1);
            courseMeta.createCell(0).setCellValue("COURSE_ID");
            courseMeta.createCell(1).setCellValue(courseId);
            Row instruction = sheet.createRow(2);
            instruction.createCell(0).setCellValue("Chỉ nhập điểm 0–" + CourseScoreScale.maxFinalScore(course)
                    + " vào cột final_score; giữ nguyên enrollment_id và thông tin học viên.");

            String[] headers = {"enrollment_id", "student_code", "student_name", "email", "status", "final_score"};
            Row header = sheet.createRow(4);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            for (int col = 0; col < headers.length; col++) {
                Cell cell = header.createCell(col);
                cell.setCellValue(headers[col]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 5;
            for (Enrollment enrollment : enrollments) {
                Student student = students.get(enrollment.getStudentId());
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(enrollment.getId());
                row.createCell(1).setCellValue(student != null && student.getStudentCode() != null ? student.getStudentCode() : "");
                row.createCell(2).setCellValue(student != null && student.getFullName() != null ? student.getFullName() : "");
                row.createCell(3).setCellValue(student != null && student.getEmail() != null ? student.getEmail() : "");
                row.createCell(4).setCellValue(enrollment.getStatus().name());
                if (enrollment.getFinalScore() != null) row.createCell(5).setCellValue(enrollment.getFinalScore().doubleValue());
            }
            sheet.createFreezePane(0, 5);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(4, Math.max(4, rowIndex - 1), 0, headers.length - 1));
            int[] widths = {18, 20, 32, 34, 18, 18};
            for (int col = 0; col < widths.length; col++) sheet.setColumnWidth(col, widths[col] * 256);
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file Excel danh sách học viên");
        }
    }

    @Override
    @Transactional
    public FinalScoreImportResponse importFinalScores(Long courseId, MultipartFile file) {
        Course course = requireInstructorCourseManager(courseId,
                "Chỉ giảng viên phụ trách mới được nhập bảng điểm cho khóa này");
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ nhập điểm cho khóa OFFLINE");
        }
        requireGradeSheetEditable(course.getId(), "nhập lại bảng điểm");
        if (file == null || file.isEmpty() || file.getSize() > 10 * 1024 * 1024
                || file.getOriginalFilename() == null
                || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng chọn file Excel .xlsx không quá 10 MB");
        }

        List<FinalScoreImportResponse.RowIssue> issues = new ArrayList<>();
        int maxScore = CourseScoreScale.maxFinalScore(course);
        Set<Long> seenEnrollmentIds = new HashSet<>();
        Set<Long> suppliedEnrollmentIds = new HashSet<>();
        int updated = 0;
        int skipped = 0;
        Long actorId = SecurityUtils.requireCurrentAccountId();
        DataFormatter formatter = new DataFormatter(Locale.US);

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null || !"COURSE_ID".equals(cellText(sheet.getRow(1), 0, formatter))
                    || !String.valueOf(courseId).equals(cellText(sheet.getRow(1), 1, formatter).replace(".0", ""))) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "File không thuộc khóa học này; hãy tải file Excel mới từ khóa hiện tại");
            }
            String[] expectedHeaders = {"enrollment_id", "student_code", "student_name", "email", "status", "final_score"};
            for (int col = 0; col < expectedHeaders.length; col++) {
                if (!expectedHeaders[col].equalsIgnoreCase(cellText(sheet.getRow(4), col, formatter))) {
                    throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Cấu trúc file không hợp lệ; hãy dùng file Excel đã xuất từ hệ thống");
                }
            }

            for (int rowIndex = 5; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isRowBlank(row, formatter)) { skipped++; continue; }
                int excelRow = rowIndex + 1;
                Long enrollmentId = parseLongCell(row.getCell(0), formatter);
                if (enrollmentId == null) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, null, "Thiếu hoặc sai enrollment_id"));
                    continue;
                }
                if (!seenEnrollmentIds.add(enrollmentId)) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, enrollmentId, "Học viên bị lặp trong file"));
                    continue;
                }
                suppliedEnrollmentIds.add(enrollmentId);
                Enrollment enrollment = enrollmentRepository.findById(enrollmentId).orElse(null);
                if (enrollment == null || !courseId.equals(enrollment.getCourseId())) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, enrollmentId, "Mã ghi danh không thuộc khóa học này"));
                    continue;
                }
                Student student = studentRepository.findById(enrollment.getStudentId()).orElse(null);
                String expectedCode = student != null ? nullToEmpty(student.getStudentCode()) : "";
                String expectedName = student != null ? nullToEmpty(student.getFullName()) : "";
                String expectedEmail = student != null ? nullToEmpty(student.getEmail()) : "";
                if (!expectedCode.equals(cellText(row, 1, formatter).trim())
                        || !expectedName.equals(cellText(row, 2, formatter).trim())
                        || !expectedEmail.equalsIgnoreCase(cellText(row, 3, formatter).trim())) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, enrollmentId, "Thông tin học viên không khớp; hãy xuất lại danh sách trước khi nhập"));
                    continue;
                }
                if (!enrollment.getStatus().name().equalsIgnoreCase(cellText(row, 4, formatter).trim())) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, enrollmentId, "Trạng thái ghi danh đã thay đổi; hãy xuất lại danh sách trước khi nhập"));
                    continue;
                }
                String scoreText = cellText(row, 5, formatter).trim();
                if (scoreText.isEmpty()) { skipped++; continue; }
                BigDecimal score;
                try {
                    Cell scoreCell = row.getCell(5);
                    if (scoreCell != null && scoreCell.getCellType() == org.apache.poi.ss.usermodel.CellType.FORMULA) {
                        throw new NumberFormatException();
                    }
                    score = new BigDecimal(scoreText.replace(',', '.')).stripTrailingZeros();
                } catch (NumberFormatException ex) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, enrollmentId,
                            "Điểm phải là số từ 0 đến " + maxScore));
                    continue;
                }
                if (score.compareTo(BigDecimal.ZERO) < 0 || score.compareTo(BigDecimal.valueOf(maxScore)) > 0
                        || Math.max(0, score.scale()) > 2) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, enrollmentId,
                            "Điểm phải từ 0 đến " + maxScore + " và tối đa 2 chữ số thập phân"));
                    continue;
                }
                if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
                    issues.add(new FinalScoreImportResponse.RowIssue(excelRow, enrollmentId, "Chỉ ghi điểm cho học viên đang học (ACTIVE)"));
                    continue;
                }
                enrollment.setFinalScore(score.setScale(2, java.math.RoundingMode.UNNECESSARY));
                enrollment.setScoreRecordedAt(LocalDateTime.now());
                enrollment.setScoreRecordedBy(actorId);
                touch(enrollment);
                enrollmentRepository.save(enrollment);
                updated++;
            }
            for (Enrollment enrollment : enrollmentRepository.findByCourseIdOrderByEnrolledAtAscIdAsc(courseId)) {
                if (!suppliedEnrollmentIds.contains(enrollment.getId())) {
                    issues.add(new FinalScoreImportResponse.RowIssue(0, enrollment.getId(),
                            "Học viên này bị thiếu trong file Excel; chưa có thay đổi điểm"));
                }
            }
        } catch (IOException ex) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không đọc được file Excel; kiểm tra định dạng .xlsx");
        }
        return new FinalScoreImportResponse(updated, skipped, issues);
    }

    private String cellText(Row row, int column, DataFormatter formatter) {
        if (row == null || row.getCell(column) == null) return "";
        return formatter.formatCellValue(row.getCell(column)).trim();
    }

    private Long parseLongCell(Cell cell, DataFormatter formatter) {
        if (cell == null || cell.getCellType() == org.apache.poi.ss.usermodel.CellType.FORMULA) return null;
        try {
            return new BigDecimal(formatter.formatCellValue(cell).trim()).longValueExact();
        } catch (NumberFormatException | ArithmeticException ex) {
            return null;
        }
    }

    private boolean isRowBlank(Row row, DataFormatter formatter) {
        for (int column = 0; column < 6; column++) {
            if (!cellText(row, column, formatter).isEmpty()) return false;
        }
        return true;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private EnrollmentResponse completeEnrollment(Long enrollmentId, Long expectedCourseId, CompletionResult result) {
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        requireInstructorCourseManager(enrollment.getCourseId(), "Chỉ giảng viên phụ trách mới được xét hoàn thành khóa học này");
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
            if (!"APPROVED".equals(getGradeReviewStatus(course.getId()).status())) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Bảng điểm chưa được duyệt, chưa thể xét hoàn thành");
            }
            if (enrollment.getFinalScore() == null) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Cần ghi nhận điểm cuối khóa trước khi xét hoàn thành");
            }
            AttendanceThreshold threshold = evaluateAttendanceThreshold(enrollment, course);
            if (threshold.notMarked() > 0) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Còn " + threshold.notMarked() + " buổi chưa điểm danh; hãy hoàn tất điểm danh trước khi xét hoàn thành");
            }
            if (result == CompletionResult.PASSED && !threshold.eligible()) {
                throw new ErrorHandler(HttpStatus.CONFLICT, threshold.reason());
            }
        } else {
            validateOnlineCompletion(enrollment, course);
        }
        enrollment.setCompletedAt(LocalDateTime.now());
        enrollment.setCompletedBy(SecurityUtils.requireCurrentAccountId());
        enrollment.setCompletionResult(result);
        return changeStatus(enrollment, EnrollmentStatus.COMPLETED,
                result == CompletionResult.PASSED ? "Hoàn thành khóa học (Đạt)" : "Hoàn thành khóa học (Không đạt)");
    }

    /**
     * Chỉ đọc: trả danh sách học viên của buổi, ghép bản ghi đã lưu với bản ghi "ảo"
     * cho người chưa điểm danh. Không tạo/sửa bất kỳ bản ghi nào.
     */
    @Override
    @Transactional(readOnly = true)
    public SessionAttendanceResponse getSessionAttendance(Long courseId, Long sessionId) {
        Session session = getSession(courseId, sessionId);
        requireCanManageSession(session);
        requireOfflineCourse(session);
        return buildSessionAttendance(session);
    }

    @Override
    @Transactional
    public SessionAttendanceResponse saveSessionAttendance(
            Long courseId, Long sessionId, SaveSessionAttendanceRequest request) {
        Session session = getSession(courseId, sessionId);
        requireCanManageSession(session);
        requireOfflineCourse(session);
        AttendanceEditability editability = attendanceEditability(session);
        if (!editability.editable()) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, editability.reason());
        }
        if (request.getRecords() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Danh sách điểm danh không được để trống");
        }

        List<Enrollment> activeEnrollments = enrollmentRepository.findByCourseIdAndStatus(
                courseId, EnrollmentStatus.ACTIVE);
        Set<Long> allowedIds = activeEnrollments.stream()
                .filter(enrollment -> isEnrollmentApplicableForSession(enrollment, session))
                .map(Enrollment::getId)
                .collect(Collectors.toSet());
        List<AttendanceRecord> existingRecords = attendanceRepository.findBySessionIdOrderByEnrollmentIdAsc(sessionId);
        existingRecords.forEach(record -> allowedIds.add(record.getEnrollmentId()));

        Long actorId = SecurityUtils.requireCurrentAccountId();
        Map<Long, AttendanceRecord> recordsByEnrollment = existingRecords.stream()
                .collect(Collectors.toMap(AttendanceRecord::getEnrollmentId, record -> record));
        LocalDateTime now = LocalDateTime.now();
        Set<Long> submittedIds = new HashSet<>();
        List<AttendanceRecord> toSave = new ArrayList<>();

        for (SaveSessionAttendanceRequest.Record submitted : request.getRecords()) {
            Long enrollmentId = submitted.getEnrollmentId();
            if (enrollmentId == null || !allowedIds.contains(enrollmentId)
                    || !submittedIds.add(enrollmentId) || submitted.getStatus() == null) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Mỗi học viên phải có một trạng thái điểm danh hợp lệ trong khóa này");
            }

            AttendanceStatus status = submitted.getStatus();
            String newNote = submitted.getNote() == null || submitted.getNote().isBlank()
                    ? null
                    : submitted.getNote().trim();

            AttendanceRecord record = recordsByEnrollment.get(enrollmentId);
            boolean isNew = record == null;
            if (isNew) {
                record = newAttendanceRecord(enrollmentId, sessionId, actorId);
            }
            String oldStatus = isNew ? AttendanceStatus.NOT_MARKED.name()
                    : record.getStatus() == null ? null : record.getStatus().name();
            String oldNote = isNew ? null : record.getNote();
            boolean changed = !Objects.equals(oldStatus, status.name())
                    || !Objects.equals(oldNote, newNote);
            boolean shouldPersist = !isNew || status != AttendanceStatus.NOT_MARKED
                    || newNote != null;
            if (!shouldPersist || (!isNew && !changed)) {
                continue;
            }

            record.setStatus(status);
            record.setNote(newNote);
            record.setUpdatedAt(now);
            record.setUpdatedBy(actorId);
            if (status == AttendanceStatus.NOT_MARKED) {
                record.setMarkedAt(null);
                record.setMarkedBy(null);
            } else {
                record.setMarkedAt(now);
                record.setMarkedBy(actorId);
            }
            toSave.add(record);

            if (changed) {
                auditAttendanceChange(sessionId, actorId, enrollmentId, oldStatus, oldNote,
                        status.name(), newNote);
            }
        }
        if (!toSave.isEmpty()) {
            attendanceRepository.saveAll(toSave);
        }
        return buildSessionAttendance(session);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceRecordResponse> getAttendanceHistory(Long enrollmentId) {
        Enrollment enrollment = getEnrollment(enrollmentId);
        requireCanView(enrollment);
        Course course = courseRepository.findById(enrollment.getCourseId()).orElse(null);
        if (course == null || course.getCourseType() != CourseType.OFFLINE) {
            return List.of();
        }
        List<Session> sessions = sessionRepository.findAttendanceSessionsByCourse(course.getId()).stream()
                .filter(session -> session.getStatus() != SessionStatus.DRAFT)
                .filter(session -> session.getEndTime() != null)
                .filter(session -> isEnrollmentApplicableForSession(enrollment, session))
                .toList();
        if (sessions.isEmpty()) {
            return List.of();
        }
        Set<Long> sessionIds = sessions.stream().map(Session::getId).collect(Collectors.toSet());
        Map<Long, AttendanceRecord> bySession = attendanceRepository
                .findByEnrollmentIdAndSessionIdIn(enrollmentId, sessionIds).stream()
                .collect(Collectors.toMap(AttendanceRecord::getSessionId, record -> record));
        List<AttendanceRecord> records = sessions.stream()
                .map(session -> bySession.getOrDefault(session.getId(),
                        virtualAttendanceRecord(enrollmentId, session.getId())))
                .toList();
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

    @Override
    @Transactional(readOnly = true)
    public AttendanceMatrixResponse getCourseAttendanceMatrix(Long courseId) {
        Course course = requireAttendanceCourseAccess(courseId);
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Ma trận điểm danh chỉ áp dụng cho khóa OFFLINE");
        }
        LocalDateTime now = LocalDateTime.now();
        List<Session> sessions = sessionRepository.findAttendanceSessionsByCourse(courseId);
        Set<Long> sessionIds = sessions.stream().map(Session::getId).collect(Collectors.toSet());
        Map<Long, Map<Long, com.ecms_web_application.OC01.entity.request.Request>> leaveByEnrollment =
                findLatestLeaveRequests(sessionIds);
        List<AttendanceRecord> records = sessionIds.isEmpty() ? List.of()
                : attendanceRepository.findBySessionIdInOrderByEnrollmentIdAsc(sessionIds);
        Map<Long, Map<Long, AttendanceRecord>> recordsByEnrollment = new HashMap<>();
        for (AttendanceRecord record : records) {
            recordsByEnrollment.computeIfAbsent(record.getEnrollmentId(), key -> new HashMap<>())
                    .put(record.getSessionId(), record);
        }

        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdOrderByEnrolledAtAscIdAsc(courseId)
                .stream()
                .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.TERMINATED
                        || recordsByEnrollment.containsKey(enrollment.getId()))
                .toList();
        Set<Long> studentIds = enrollments.stream().map(Enrollment::getStudentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Student> students = studentRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(Student::getId, student -> student));

        List<AttendanceMatrixResponse.SessionColumn> sessionColumns = sessions.stream()
                .map(session -> {
                    AttendanceEditability editability = attendanceEditability(session);
                    return new AttendanceMatrixResponse.SessionColumn(
                            session.getId(), session.getSessionNumber(), session.getTitle(),
                            session.getSessionDate(), session.getStartTime(), session.getEndTime(),
                            session.getStatus() != null ? session.getStatus().name() : null,
                            editability.editable(), editability.reason(), editability.deadline());
                }).toList();

        int conductedSessions = (int) sessions.stream()
                .filter(session -> session.getEndTime() != null && !session.getEndTime().isAfter(now))
                .count();

        List<AttendanceMatrixResponse.StudentRow> studentsRows = new ArrayList<>();
        for (Enrollment enrollment : enrollments) {
            Student student = students.get(enrollment.getStudentId());
            Map<Long, AttendanceMatrixResponse.Cell> cells = new LinkedHashMap<>();
            int present = 0, absent = 0, excused = 0, notMarked = 0, applicable = 0;

            for (Session session : sessions) {
                AttendanceRecord record = recordsByEnrollment
                        .getOrDefault(enrollment.getId(), Map.of())
                        .get(session.getId());
                boolean applicableForSession = isEnrollmentApplicableForSession(enrollment, session);
                com.ecms_web_application.OC01.entity.request.Request leave = leaveByEnrollment
                        .getOrDefault(enrollment.getId(), Map.of())
                        .get(session.getId());
                Long leaveRequestId = leave == null ? null : leave.getId();
                String leaveRequestStatus = leave == null || leave.getStatus() == null
                        ? null : leave.getStatus().name();
                String leaveReason = leave == null ? null : leaveReason(leave);
                if (record != null) {
                    cells.put(session.getId(), new AttendanceMatrixResponse.Cell(
                            record.getId(),
                            record.getStatus() != null ? record.getStatus().name() : AttendanceStatus.NOT_MARKED.name(),
                            record.getNote(), leaveRequestId, leaveRequestStatus, leaveReason));
                } else if (applicableForSession) {
                    cells.put(session.getId(), new AttendanceMatrixResponse.Cell(
                            null, AttendanceStatus.NOT_MARKED.name(), null,
                            leaveRequestId, leaveRequestStatus, leaveReason));
                }

                boolean conducted = session.getEndTime() != null && !session.getEndTime().isAfter(now);
                if (!conducted || !applicableForSession) {
                    continue;
                }
                applicable++;
                AttendanceStatus status = record == null || record.getStatus() == null
                        ? AttendanceStatus.NOT_MARKED : record.getStatus();
                switch (status) {
                    case PRESENT -> present++;
                    case ABSENT -> absent++;
                    case EXCUSED -> excused++;
                    default -> notMarked++;
                }
            }

            double absencePoints = absent;
            double absencePercent = applicable == 0 ? 0 : absencePoints * 100.0 / applicable;
            studentsRows.add(new AttendanceMatrixResponse.StudentRow(
                    enrollment.getId(), enrollment.getStudentId(),
                    student != null ? student.getStudentCode() : null,
                    student != null ? student.getFullName() : null,
                    student != null ? student.getEmail() : null,
                    enrollment.getStatus(), cells,
                    new AttendanceMatrixResponse.Summary(present, absent, excused, notMarked,
                            round1(absencePoints), round1(absencePercent))));
        }

        return new AttendanceMatrixResponse(course.getId(), course.getCode(), course.getTitle(),
                conductedSessions, sessionColumns, studentsRows,
                new AttendanceMatrixResponse.Rules(attendanceMaxAbsencePercent));
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCourseAttendance(Long courseId) {
        AttendanceMatrixResponse matrix = getCourseAttendanceMatrix(courseId);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Diem danh");
            Row title = sheet.createRow(0);
            title.createCell(0).setCellValue("MA TRẬN ĐIỂM DANH KHÓA HỌC");
            Row courseMeta = sheet.createRow(1);
            courseMeta.createCell(0).setCellValue("Mã khóa:");
            courseMeta.createCell(1).setCellValue(nullToEmpty(matrix.courseCode()));
            courseMeta.createCell(2).setCellValue("Tên khóa:");
            courseMeta.createCell(3).setCellValue(nullToEmpty(matrix.courseTitle()));

            Row rulesRow = sheet.createRow(2);
            rulesRow.createCell(0).setCellValue(String.format(Locale.ROOT,
                    "Vắng tối đa %.1f%% để được xét hoàn thành khóa OFFLINE.",
                    matrix.rules().maxAbsencePercent()));

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            Row header = sheet.createRow(4);
            String[] fixedHeaders = {"STT", "Mã học viên", "Họ tên", "Email", "Trạng thái"};
            for (int col = 0; col < fixedHeaders.length; col++) {
                Cell cell = header.createCell(col);
                cell.setCellValue(fixedHeaders[col]);
                cell.setCellStyle(headerStyle);
            }
            int columnIndex = fixedHeaders.length;
            for (AttendanceMatrixResponse.SessionColumn session : matrix.sessions()) {
                Cell cell = header.createCell(columnIndex++);
                cell.setCellValue(String.format("Buổi %s (%s)", session.sessionNumber(),
                        session.sessionDate() != null ? session.sessionDate() : ""));
                cell.setCellStyle(headerStyle);
            }
            String[] summaryHeaders = {"Có mặt", "Vắng", "Có phép", "Chưa ĐD", "Tỉ lệ vắng (%)"};
            for (String summaryHeader : summaryHeaders) {
                Cell cell = header.createCell(columnIndex++);
                cell.setCellValue(summaryHeader);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 5;
            int studentIndex = 1;
            for (AttendanceMatrixResponse.StudentRow student : matrix.students()) {
                Row row = sheet.createRow(rowIndex++);
                int col = 0;
                row.createCell(col++).setCellValue(studentIndex++);
                row.createCell(col++).setCellValue(nullToEmpty(student.studentCode()));
                row.createCell(col++).setCellValue(nullToEmpty(student.studentName()));
                row.createCell(col++).setCellValue(nullToEmpty(student.email()));
                row.createCell(col++).setCellValue(student.enrollmentStatus() == null
                        ? "" : student.enrollmentStatus().name());
                for (AttendanceMatrixResponse.SessionColumn session : matrix.sessions()) {
                    AttendanceMatrixResponse.Cell cell = student.cells().get(session.sessionId());
                    row.createCell(col++).setCellValue(cell == null ? "" : attendanceShortLabel(cell.status()));
                }
                AttendanceMatrixResponse.Summary summary = student.summary();
                row.createCell(col++).setCellValue(summary.present());
                row.createCell(col++).setCellValue(summary.absent());
                row.createCell(col++).setCellValue(summary.excused());
                row.createCell(col++).setCellValue(summary.notMarked());
                row.createCell(col++).setCellValue(summary.absencePercent());
            }

            sheet.createFreezePane(fixedHeaders.length, 5);
            for (int col = 0; col < fixedHeaders.length; col++) {
                sheet.setColumnWidth(col, (col == 2 ? 32 : 18) * 256);
            }
            for (int i = 0; i < matrix.sessions().size(); i++) {
                sheet.setColumnWidth(fixedHeaders.length + i, 16 * 256);
            }
            for (int i = 0; i < summaryHeaders.length; i++) {
                sheet.setColumnWidth(fixedHeaders.length + matrix.sessions().size() + i, 14 * 256);
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file Excel điểm danh");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceAuditLogResponse> getSessionAttendanceHistory(Long courseId, Long sessionId) {
        Session session = getSession(courseId, sessionId);
        requireCanManageSession(session);
        requireOfflineCourse(session);
        List<AuditLog> logs = auditLogRepository
                .findByEntityTypeAndEntityIdOrderByCreatedAtDesc(ATTENDANCE_AUDIT_ENTITY, sessionId);
        Set<Long> actorIds = logs.stream().map(AuditLog::getActorId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Account> actors = accountRepository.findAllById(actorIds).stream()
                .collect(Collectors.toMap(Account::getId, account -> account));
        return logs.stream()
                .map(log -> AttendanceAuditLogResponse.from(log,
                        fullNameOrEmail(actors.get(log.getActorId()))))
                .toList();
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

    private SessionAttendanceResponse buildSessionAttendance(Session session) {
        Long courseId = session.getCourse().getId();
        List<AttendanceRecord> existing = attendanceRepository
                .findBySessionIdOrderByEnrollmentIdAsc(session.getId());
        Map<Long, AttendanceRecord> existingByEnrollment = existing.stream()
                .collect(Collectors.toMap(AttendanceRecord::getEnrollmentId, record -> record));
        Map<Long, AttendanceRecord> merged = new LinkedHashMap<>();
        enrollmentRepository.findByCourseIdAndStatus(courseId, EnrollmentStatus.ACTIVE).stream()
                .filter(enrollment -> isEnrollmentApplicableForSession(enrollment, session))
                .sorted(Comparator.comparing(Enrollment::getId))
                .forEach(enrollment -> merged.put(enrollment.getId(),
                        existingByEnrollment.getOrDefault(enrollment.getId(),
                                virtualAttendanceRecord(enrollment.getId(), session.getId()))));
        // Giữ nguyên lịch sử của học viên không còn ACTIVE tại thời điểm hiện tại.
        existing.forEach(record -> merged.putIfAbsent(record.getEnrollmentId(), record));
        List<AttendanceRecord> records = merged.values().stream()
                .sorted(Comparator.comparing(AttendanceRecord::getEnrollmentId))
                .toList();
        AttendanceEditability editability = attendanceEditability(session);
        return new SessionAttendanceResponse(courseId, session.getId(),
                editability.editable(), editability.reason(), editability.deadline(),
                attendanceResponses(records));
    }

    private AttendanceRecord virtualAttendanceRecord(Long enrollmentId, Long sessionId) {
        AttendanceRecord record = new AttendanceRecord();
        record.setEnrollmentId(enrollmentId);
        record.setSessionId(sessionId);
        record.setStatus(AttendanceStatus.NOT_MARKED);
        return record;
    }

    private void auditAttendanceChange(Long sessionId, Long actorId, Long enrollmentId,
            String oldStatus, String oldNote, String newStatus, String newNote) {
        AuditLog log = new AuditLog();
        log.setActorId(actorId);
        log.setAction("NOT_MARKED".equals(oldStatus) ? "CREATE" : "UPDATE");
        log.setEntityType(ATTENDANCE_AUDIT_ENTITY);
        log.setEntityId(sessionId);
        log.setOldValue(attendanceSnapshot(enrollmentId, oldStatus, oldNote));
        log.setNewValue(attendanceSnapshot(enrollmentId, newStatus, newNote));
        auditLogRepository.save(log);
    }

    private Map<String, Object> attendanceSnapshot(Long enrollmentId, String status, String note) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("enrollmentId", enrollmentId);
        snapshot.put("status", status);
        snapshot.put("note", note);
        return snapshot;
    }

    private AttendanceEditability attendanceEditability(Session session) {
        LocalDateTime deadline = session.getEndTime() == null ? null
                : session.getEndTime().plusDays(attendanceEditWindowDays);
        if (SecurityUtils.hasRole("ADMIN")) {
            return new AttendanceEditability(false, "Quản trị viên chỉ được xem điểm danh", deadline);
        }
        Long accountId = SecurityUtils.requireCurrentAccountId();
        if (!isAssignedToSession(session, accountId)) {
            return new AttendanceEditability(false, "Bạn không được phân công buổi học này", deadline);
        }
        if (session.getStatus() == SessionStatus.CANCELLED) {
            return new AttendanceEditability(false, "Buổi học đã bị hủy nên không thể điểm danh", deadline);
        }
        if (deadline != null && LocalDateTime.now().isAfter(deadline)) {
            return new AttendanceEditability(false, String.format(
                    "Đã quá hạn chỉnh sửa điểm danh (%d ngày sau khi buổi học kết thúc). Vui lòng liên hệ học vụ.",
                    attendanceEditWindowDays), deadline);
        }
        return new AttendanceEditability(true, null, deadline);
    }

    private boolean isAssignedToSession(Session session, Long accountId) {
        return session.getCourse() != null
                && session.getCourse().getTeacher() != null
                && accountId.equals(session.getCourse().getTeacher().getId())
                || session.getTeacher() != null && accountId.equals(session.getTeacher().getId())
                || session.getSubstituteTeacher() != null && accountId.equals(session.getSubstituteTeacher().getId())
                || session.getAssistant() != null && accountId.equals(session.getAssistant().getId());
    }

    private boolean isEnrollmentApplicableForSession(Enrollment enrollment, Session session) {
        boolean joinedBeforeEnd = enrollment.getEnrolledAt() == null
                || !enrollment.getEnrolledAt().isAfter(session.getEndTime());
        return joinedBeforeEnd && !isEnrollmentOnHoldForSession(enrollment, session);
    }

    private void requireOfflineCourse(Session session) {
        if (session.getCourse().getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Điểm danh chỉ áp dụng cho khóa OFFLINE");
        }
    }

    private String fullNameOrEmail(Account account) {
        if (account == null) return null;
        return account.getUserProfile() != null && account.getUserProfile().getFullName() != null
                ? account.getUserProfile().getFullName()
                : account.getEmail();
    }

    private static String attendanceShortLabel(String status) {
        if (status == null) return "";
        return switch (status) {
            case "PRESENT" -> "Có";
            case "ABSENT" -> "Vắng";
            case "EXCUSED" -> "Phép";
            default -> "—";
        };
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record AttendanceEditability(boolean editable, String reason, LocalDateTime deadline) {
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
        // Lấy tất cả đơn xin nghỉ phép cho các session liên quan
        // key: (enrollmentId, sessionId) → Request mới nhất
        Map<Long, Map<Long, com.ecms_web_application.OC01.entity.request.Request>> leaveByEnrollment =
                findLatestLeaveRequests(sessionIds);
        return records.stream().map(record -> {
            Enrollment enrollment = enrollmentMap.get(record.getEnrollmentId());
            Student student = enrollment == null ? null : studentMap.get(enrollment.getStudentId());
            com.ecms_web_application.OC01.entity.request.Request leave = leaveByEnrollment
                    .getOrDefault(record.getEnrollmentId(), Map.of())
                    .get(record.getSessionId());
            if (leave == null) {
                return AttendanceRecordResponse.from(record, sessionMap.get(record.getSessionId()), student);
            }
            String leaveReason = leaveReason(leave);
            return AttendanceRecordResponse.from(record, sessionMap.get(record.getSessionId()), student,
                    leave.getId(), leave.getStatus().name(), leaveReason);
        }).toList();
    }

    private String leaveReason(com.ecms_web_application.OC01.entity.request.Request leave) {
        if (leave.getDescription() != null && !leave.getDescription().isBlank()) {
            return leave.getDescription();
        }
        if (leave.getPayload() != null) {
            Object reason = leave.getPayload().get("reason");
            if (reason != null) return reason.toString();
        }
        return null;
    }

    /**
     * Map (enrollmentId → sessionId → đơn nghỉ mới nhất) dùng cho cả ma trận điểm danh
     * lẫn chi tiết buổi học, để người dùng thấy đơn ngay tại ô điểm danh của từng học viên.
     */
    private Map<Long, Map<Long, com.ecms_web_application.OC01.entity.request.Request>>
            findLatestLeaveRequests(Set<Long> sessionIds) {
        Map<Long, Map<Long, com.ecms_web_application.OC01.entity.request.Request>> result = new HashMap<>();
        if (sessionIds == null || sessionIds.isEmpty()) return result;
        for (Long sessionId : sessionIds) {
            List<com.ecms_web_application.OC01.entity.request.Request> leaveRequests =
                    requestRepository.findAllByTargetAndType(
                            "SESSION", sessionId,
                            com.ecms_web_application.OC01.entity.enums.RequestType.LEAVE_FEEDBACK,
                            org.springframework.data.domain.Pageable.unpaged());
            for (com.ecms_web_application.OC01.entity.request.Request req : leaveRequests) {
                Object enrollmentIdObj = req.getPayload() == null ? null : req.getPayload().get("enrollmentId");
                if (enrollmentIdObj == null) continue;
                Long enrollmentId;
                if (enrollmentIdObj instanceof Number num) {
                    enrollmentId = num.longValue();
                } else {
                    try { enrollmentId = Long.parseLong(enrollmentIdObj.toString()); }
                    catch (NumberFormatException ignored) { continue; }
                }
                // findAllByTargetAndType ORDER BY createdAt DESC → giữ bản ghi mới nhất
                result.computeIfAbsent(enrollmentId, key -> new HashMap<>())
                        .putIfAbsent(sessionId, req);
            }
        }
        return result;
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
        eventPublisher.publishEvent(new EnrollmentCreatedEvent(saved.getId()));
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
        if (course.getCourseType() == CourseType.OFFLINE) {
            if (!"APPROVED".equals(getGradeReviewStatus(course.getId()).status())) {
                return new CompletionEligibility(false, "Bảng điểm chưa được duyệt");
            }
            if (enrollment.getFinalScore() == null) {
                return new CompletionEligibility(false, "Cần ghi nhận điểm cuối khóa trước");
            }
            AttendanceThreshold threshold = evaluateAttendanceThreshold(enrollment, course);
            if (threshold.notMarked() > 0) {
                return new CompletionEligibility(false, "Còn " + threshold.notMarked() + " buổi chưa điểm danh");
            }
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

    /**
     * Quy tắc ngưỡng vắng cho khóa OFFLINE:
     * <ul>
     *   <li>Chỉ tính các buổi đã kết thúc và không bị hủy.</li>
     *   <li>Chỉ tính các buổi học viên thực sự thuộc diện (đã ghi danh trước khi buổi
     *       kết thúc và không bảo lưu tại buổi đó).</li>
     *   <li>ABSENT = 1 buổi vắng, EXCUSED = 0 (vẫn ghi nhận nhưng không tính vào ngưỡng).</li>
     *   <li>Không xét hoàn thành khi còn buổi chưa điểm danh.</li>
     * </ul>
     */
    private AttendanceThreshold evaluateAttendanceThreshold(Enrollment enrollment, Course course) {
        return evaluateAttendanceThreshold(enrollment,
                sessionRepository.findConductedSessions(course.getId(), LocalDateTime.now()));
    }

    private AttendanceThreshold evaluateAttendanceThreshold(Enrollment enrollment, List<Session> conducted) {
        if (conducted.isEmpty()) {
            return new AttendanceThreshold(true, null, 0, 0, 0, 0);
        }
        Set<Long> conductedIds = conducted.stream().map(Session::getId).collect(Collectors.toSet());
        Map<Long, AttendanceRecord> records = attendanceRepository
                .findByEnrollmentIdAndSessionIdIn(enrollment.getId(), conductedIds).stream()
                .collect(Collectors.toMap(AttendanceRecord::getSessionId, record -> record, (first, ignored) -> first));

        int applicable = 0, absent = 0, excused = 0, notMarked = 0;
        for (Session session : conducted) {
            if (!isEnrollmentApplicableForSession(enrollment, session)) {
                continue;
            }
            applicable++;
            AttendanceRecord record = records.get(session.getId());
            AttendanceStatus status = record == null || record.getStatus() == null
                    ? AttendanceStatus.NOT_MARKED : record.getStatus();
            switch (status) {
                case PRESENT -> { }
                case ABSENT -> absent++;
                case EXCUSED -> excused++;
                default -> notMarked++;
            }
        }
        if (notMarked > 0) {
            return new AttendanceThreshold(false,
                    "Còn " + notMarked + " buổi chưa điểm danh; hãy hoàn tất điểm danh trước khi xét hoàn thành",
                    absent, excused, notMarked, applicable);
        }
        double absencePoints = absent;
        double absencePercent = applicable == 0 ? 0 : absencePoints * 100.0 / applicable;
        if (absencePercent > attendanceMaxAbsencePercent + 0.0001) {
            return new AttendanceThreshold(false, String.format(Locale.ROOT,
                    "Vượt ngưỡng vắng tối đa %.1f%% (hiện tại %.1f%%: %d buổi vắng trên %d buổi)",
                    attendanceMaxAbsencePercent, absencePercent, absent, applicable),
                    absent, excused, notMarked, applicable);
        }
        return new AttendanceThreshold(true, null, absent, excused, notMarked, applicable);
    }

    private record AttendanceThreshold(boolean eligible, String reason,
            int absent, int excused, int notMarked, int applicable) {
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

    private Specification<Enrollment> buildSearchSpecification(EnrollmentType type, EnrollmentStatus status, CompletionResult completionResult,
            Long courseId, Long studentId, Long accountId, Long ownerAccountId, Long ownerStudentId,
            Long ownerTeacherId, String search) {
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
            if (completionResult != null) {
                predicates.add(cb.equal(root.get("status"), EnrollmentStatus.COMPLETED));
                predicates.add(cb.equal(root.get("completionResult"), completionResult));
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
            if (ownerTeacherId != null) {
                Subquery<Long> teacherCourseMatch = query.subquery(Long.class);
                Root<Course> teacherCourse = teacherCourseMatch.from(Course.class);
                teacherCourseMatch.select(teacherCourse.get("id"))
                        .where(cb.equal(teacherCourse.get("teacher").get("id"), ownerTeacherId));
                predicates.add(root.get("courseId").in(teacherCourseMatch));
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
        String courseCode = c != null ? c.getCode() : null;
        String invoiceCode = inv != null ? inv.getInvoiceCode() : null;
        long absences = attendanceRepository.countByEnrollmentIdAndStatus(e.getId(), AttendanceStatus.ABSENT);

        return EnrollmentResponse.from(e, enrollmentType(c), accountId, absences,
                studentName, studentCode, studentEmail, studentPhone, courseTitle, courseCode, invoiceCode,
                false, null, shouldHideScoreFromStudent(c));
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
        if (ownsAsStudent) {
            return;
        }
        if (SecurityUtils.hasRole("INSTRUCTOR") && teacherOwnsCourse(accountId, enrollment.getCourseId())) {
            return;
        }
        throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền xem ghi danh này");
    }

    private boolean teacherOwnsCourse(Long accountId, Long courseId) {
        if (accountId == null || courseId == null) {
            return false;
        }
        return courseRepository.findById(courseId)
                .map(course -> course.getTeacher() != null
                        && accountId.equals(course.getTeacher().getId()))
                .orElse(false);
    }

    /**
     * ADMIN được thao tác mọi khóa; INSTRUCTOR chỉ được thao tác trên khóa OFFLINE
     * mình phụ trách. Dùng cho các thao tác danh sách học viên/điểm/hoàn thành.
     */
    private Course requireCourseManager(Long courseId, String forbiddenMessage) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        if (SecurityUtils.hasRole("ADMIN")) {
            return course;
        }
        Long accountId = SecurityUtils.requireCurrentAccountId();
        boolean isOwner = course.getTeacher() != null
                && accountId.equals(course.getTeacher().getId());
        if (!SecurityUtils.hasRole("INSTRUCTOR") || !isOwner) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, forbiddenMessage);
        }
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN,
                    "Giảng viên chỉ thao tác danh sách học viên trên khóa OFFLINE");
        }
        return course;
    }

    private Course requireInstructorCourseManager(Long courseId, String forbiddenMessage) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        Long accountId = SecurityUtils.requireCurrentAccountId();
        boolean isOwner = course.getTeacher() != null && accountId.equals(course.getTeacher().getId());
        if (!SecurityUtils.hasRole("INSTRUCTOR") || !isOwner || course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, forbiddenMessage);
        }
        return course;
    }

    private Course requireAttendanceCourseAccess(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Ma trận điểm danh chỉ áp dụng cho khóa OFFLINE");
        }
        if (SecurityUtils.hasRole("ADMIN")) {
            return course;
        }
        Long accountId = SecurityUtils.requireCurrentAccountId();
        if (!SecurityUtils.hasRole("INSTRUCTOR")
                || !sessionRepository.existsAttendanceAssignment(courseId, accountId)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không được phân công điểm danh khóa học này");
        }
        return course;
    }

    private void requireCanManageSession(Session session) {
        if (SecurityUtils.hasRole("ADMIN"))
            return;
        Long accountId = SecurityUtils.requireCurrentAccountId();
        if (!isAssignedToSession(session, accountId)) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không được phân công buổi học này");
        }
    }

    /** Bảng điểm đã duyệt là bản chốt: không cho sửa điểm/nhập lại cho tới khi có yêu cầu mở lại. */
    private void requireGradeSheetEditable(Long courseId, String action) {
        boolean approved = requestRepository
                .findLatestByTargetAndType("COURSE", courseId, RequestType.COURSE_GRADE_APPROVAL)
                .map(r -> r.getStatus() == RequestStatus.APPROVED)
                .orElse(false);
        if (approved) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Bảng điểm đã được Quản trị viên phê duyệt và công bố; không thể " + action + ".");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public GradeReviewStatusResponse getGradeReviewStatus(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        if (course.getCourseType() != CourseType.OFFLINE) {
            return GradeReviewStatusResponse.draft();
        }
        Optional<Request> latestOpt = requestRepository.findLatestByTargetAndType(
                "COURSE", courseId, RequestType.COURSE_GRADE_APPROVAL);
        if (latestOpt.isEmpty()) {
            return GradeReviewStatusResponse.draft();
        }
        Request req = latestOpt.get();
        String statusStr;
        switch (req.getStatus()) {
            case PENDING -> statusStr = "PENDING_APPROVAL";
            case APPROVED -> statusStr = "APPROVED";
            case REJECTED -> statusStr = "REJECTED";
            default -> statusStr = "DRAFT";
        }
        return new GradeReviewStatusResponse(
                statusStr,
                req.getId(),
                req.getRequestCode(),
                req.getCreatedAt(),
                req.getRejectReason(),
                req.getResolvedAt()
        );
    }

    @Override
    @Transactional
    public GradeReviewStatusResponse submitGradeReview(Long courseId) {
        Course course = requireCourseManager(courseId, "Bạn không có quyền gửi duyệt bảng điểm cho khóa này");
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ khóa học OFFLINE mới cần gửi duyệt bảng điểm");
        }
        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdOrderByEnrolledAtAscIdAsc(courseId);
        long activeWithScore = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE && e.getFinalScore() != null)
                .count();
        if (activeWithScore == 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Cần nhập điểm cuối khóa cho ít nhất 1 học viên trước khi gửi duyệt");
        }

        if (requestRepository.existsByRequestTypeAndTargetEntityTypeAndTargetEntityIdAndStatus(
                RequestType.COURSE_GRADE_APPROVAL, "COURSE", courseId, RequestStatus.PENDING)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Bảng điểm đang chờ duyệt, vui lòng không gửi lại");
        }
        requireGradeSheetEditable(courseId, "gửi duyệt lại bảng điểm");

        long totalActive = enrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).count();
        List<Enrollment> activeEnrollments = enrollments.stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .toList();
        List<Session> conductedSessions = sessionRepository.findConductedSessions(courseId, LocalDateTime.now());
        Set<Long> studentIds = activeEnrollments.stream()
                .map(Enrollment::getStudentId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Student> students = studentRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(Student::getId, s -> s));

        int maxFinalScore = CourseScoreScale.maxFinalScore(course);
        BigDecimal maxRecorded = activeEnrollments.stream()
                .map(Enrollment::getFinalScore).filter(Objects::nonNull)
                .max(BigDecimal::compareTo).orElse(null);
        boolean scale10 = maxRecorded != null && maxRecorded.compareTo(BigDecimal.TEN) <= 0;
        BigDecimal passScore = scale10 ? BigDecimal.valueOf(5) : BigDecimal.valueOf(maxFinalScore / 2.0);

        List<Map<String, Object>> gradeRows = new ArrayList<>();
        int passedCount = 0;
        int noScoreCount = 0;
        for (Enrollment e : activeEnrollments) {
            Student s = students.get(e.getStudentId());
            AttendanceThreshold threshold = evaluateAttendanceThreshold(e, conductedSessions);
            BigDecimal score = e.getFinalScore();
            boolean passed = false;
            String note = null;
            if (score == null) {
                note = "Chưa có điểm cuối khóa";
                noScoreCount++;
            } else if (threshold.notMarked() > 0) {
                note = threshold.reason();
            } else if (score.compareTo(passScore) < 0) {
                note = "Điểm " + score.stripTrailingZeros().toPlainString()
                        + " < " + passScore.stripTrailingZeros().toPlainString();
            } else if (!threshold.eligible()) {
                note = threshold.reason();
            } else {
                passed = true;
                passedCount++;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("enrollmentId", e.getId());
            row.put("studentCode", s != null ? s.getStudentCode() : null);
            row.put("studentName", s != null ? s.getFullName() : null);
            row.put("finalScore", score);
            row.put("absenceCount", threshold.absent());
            row.put("totalSessions", threshold.applicable());
            row.put("maxAbsencePercent", attendanceMaxAbsencePercent);
            row.put("passed", passed);
            row.put("note", note);
            gradeRows.add(row);
        }

        String submittedByName = null;
        if (course.getTeacher() != null) {
            submittedByName = course.getTeacher().getUserProfile() != null
                    ? course.getTeacher().getUserProfile().getFullName()
                    : course.getTeacher().getEmail();
        }

        RequestCreateRequest req = new RequestCreateRequest();
        req.setRequestType(RequestType.COURSE_GRADE_APPROVAL.name());
        req.setTitle("Phê duyệt bảng điểm: " + course.getTitle());
        req.setDescription(String.format("Giảng viên gửi duyệt bảng điểm cho khóa %s (%d/%d học viên đã có điểm)",
                course.getCode(), activeWithScore, totalActive));
        req.setTargetEntityId(courseId);

        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("courseId", courseId);
        payload.put("courseCode", course.getCode());
        payload.put("courseTitle", course.getTitle());
        payload.put("submittedAt", LocalDateTime.now().toString());
        payload.put("submittedByName", submittedByName);
        payload.put("passScore", passScore);
        payload.put("maxFinalScore", maxFinalScore);
        payload.put("maxAbsencePercent", attendanceMaxAbsencePercent);
        payload.put("scoredStudents", activeWithScore);
        payload.put("totalActiveStudents", totalActive);
        payload.put("totalStudents", totalActive);
        payload.put("passedCount", passedCount);
        payload.put("failedCount", activeEnrollments.size() - passedCount - noScoreCount);
        payload.put("noScoreCount", noScoreCount);
        payload.put("grades", gradeRows);
        req.setPayload(payload);

        requestService.create(req);
        return getGradeReviewStatus(courseId);
    }
}
