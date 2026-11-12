package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.StudentConvertFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReplaceSessionAbsencesRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.StudentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.*;
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
    private static final List<EnrollmentStatus> SEAT_HOLDING_STATUSES = List.of(EnrollmentStatus.PENDING,
            EnrollmentStatus.ACTIVE);

    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentStatusLogRepository statusLogRepository;
    private final StudentService studentService;
    private final AttendanceAbsenceRepository attendanceRepository;
    private final InvoiceRepository invoiceRepository;
    private final LeadRepository leadRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final AccountRepository accountRepository;
    private final SessionRepository sessionRepository;
    private final CourseResourceRepository courseResourceRepository;
    private final ProgressRepository progressRepository;
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
    public OfflineEnrollmentBatchResponse createOfflineBatch(List<Long> invoiceIds) {
        requireAdmin();
        if (invoiceIds == null || invoiceIds.isEmpty() || invoiceIds.size() > 100) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mỗi lần cần chọn từ 1 đến 100 học viên");
        }

        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        List<OfflineEnrollmentBatchResponse.Item> results = new ArrayList<>();
        Set<Long> uniqueInvoiceIds = new LinkedHashSet<>(invoiceIds);
        int enrolled = 0;
        for (Long invoiceId : uniqueInvoiceIds) {
            try {
                EnrollmentResponse result = transaction.execute(status -> createOfflineFromPaidInvoice(invoiceId));
                results.add(new OfflineEnrollmentBatchResponse.Item(
                        invoiceId, true, result != null ? result.enrollmentId() : null, "Ghi danh thành công"));
                enrolled++;
            } catch (Exception ex) {
                results.add(new OfflineEnrollmentBatchResponse.Item(
                        invoiceId, false, null, ex.getMessage() != null ? ex.getMessage() : "Không thể ghi danh"));
            }
        }
        return new OfflineEnrollmentBatchResponse(enrolled, results.size() - enrolled, results);
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
            if (existing.getEnrollmentType() != EnrollmentType.OFFLINE) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn đã được dùng cho ghi danh ONLINE");
            }
            return response(existing);
        }
        ensureOfflineStudentProfile(invoice);
        if (enrollmentRepository.existsByCourseIdAndStudentId(course.getId(), invoice.getStudentId())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Học viên đã có ghi danh trong khóa học này");
        }
        Long actorId = invoice.getConfirmedBy() != null ? invoice.getConfirmedBy() : invoice.getCreatedBy();
        return createEnrollment(invoice, course, EnrollmentType.OFFLINE,
                course.getStartDate() != null && !course.getStartDate().isAfter(LocalDate.now())
                        ? EnrollmentStatus.ACTIVE
                        : EnrollmentStatus.PENDING,
                actorId);
    }

    private void ensureOfflineStudentProfile(Invoice invoice) {
        if (invoice.getStudentId() != null) {
            return;
        }
        if (invoice.getAccountId() != null) {
            Student existing = studentRepository.findByUserId(invoice.getAccountId()).orElse(null);
            if (existing != null) {
                invoice.setStudentId(existing.getId());
                invoiceRepository.save(invoice);
                return;
            }
        }
        if (invoice.getLeadId() == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Hóa đơn chưa liên kết hồ sơ học viên hoặc lead; không thể tạo ghi danh OFFLINE");
        }
        StudentConvertFromLeadRequest request = new StudentConvertFromLeadRequest();
        request.setLeadId(invoice.getLeadId());
        request.setCourseId(invoice.getCourseId());
        request.setNote("Tự động tạo hồ sơ học viên khi ghi danh từ hóa đơn " + invoice.getInvoiceCode());
        StudentResponse student = studentService.convertFromLead(request);
        invoice.setStudentId(student.getId());
        invoiceRepository.save(invoice);
    }

    @Override
    @Transactional
    public EnrollmentResponse createOnlineFromPaidInvoice(Long invoiceId) {
        Invoice invoice = getInvoice(invoiceId);
        validatePaidTuitionInvoice(invoice);
        Enrollment existing = enrollmentRepository.findByInvoiceId(invoiceId).orElse(null);
        if (existing != null) {
            if (existing.getEnrollmentType() != EnrollmentType.ONLINE) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn đã được dùng cho ghi danh OFFLINE");
            }
            return response(existing);
        }
        if (invoice.getAccountId() == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Hóa đơn ONLINE phải liên kết với tài khoản người học");
        }
        Course course = lockAndGetCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.ONLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Hóa đơn này không thuộc khóa ONLINE");
        }
        Long actorId = invoice.getConfirmedBy() != null ? invoice.getConfirmedBy() : invoice.getCreatedBy();
        return createEnrollment(invoice, course, EnrollmentType.ONLINE, EnrollmentStatus.ACTIVE, actorId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OfflineEnrollmentCandidateResponse> searchOfflineCandidates(Long courseId, String search, Pageable pageable) {
        requireAdmin();
        if (courseId != null) {
            Course course = getCourse(courseId);
            if (course.getCourseType() != CourseType.OFFLINE) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ khóa OFFLINE mới có danh sách chờ ghi danh");
            }
        }

        String searchTerm = search == null || search.isBlank() ? "" : search.trim();
        Page<Invoice> invoices = invoiceRepository.findOfflineEnrollmentCandidates(
                courseId, InvoiceType.TUITION_PAYMENT, InvoiceStatus.PAID,
                searchTerm, CourseType.OFFLINE, pageable);
        Set<Long> leadIds = invoices.stream().map(Invoice::getLeadId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> studentIds = invoices.stream().map(Invoice::getStudentId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> accountIds = invoices.stream().map(Invoice::getAccountId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> courseIds = invoices.stream().map(Invoice::getCourseId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Lead> leads = leadRepository.findAllById(leadIds).stream()
                .collect(Collectors.toMap(Lead::getId, lead -> lead));
        leads.values().stream().map(Lead::getStudentId).filter(Objects::nonNull).forEach(studentIds::add);
        List<Student> studentRows = new ArrayList<>(studentRepository.findAllById(studentIds));
        if (!accountIds.isEmpty()) studentRows.addAll(studentRepository.findByUserIdIn(accountIds));
        Map<Long, Student> students = studentRows.stream()
                .collect(Collectors.toMap(Student::getId, student -> student, (first, ignored) -> first));
        Map<Long, Student> studentsByAccount = studentRows.stream().filter(student -> student.getUserId() != null)
                .collect(Collectors.toMap(Student::getUserId, student -> student, (first, ignored) -> first));
        Map<Long, Account> accounts = accountRepository.findAllById(accountIds).stream()
                .collect(Collectors.toMap(Account::getId, account -> account));
        Map<Long, Course> courses = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, course -> course));

        return invoices.map(invoice -> {
            Course course = courses.get(invoice.getCourseId());
            Student student = invoice.getStudentId() != null ? students.get(invoice.getStudentId()) : null;
            if (student == null && invoice.getAccountId() != null) {
                student = studentsByAccount.get(invoice.getAccountId());
            }
            Lead lead = invoice.getLeadId() != null ? leads.get(invoice.getLeadId()) : null;
            if (student == null && lead != null && lead.getStudentId() != null) {
                student = students.get(lead.getStudentId());
            }
            Account account = invoice.getAccountId() != null ? accounts.get(invoice.getAccountId()) : null;
            UserProfile profile = account != null ? account.getUserProfile() : null;
            return new OfflineEnrollmentCandidateResponse(
                    invoice.getCourseId(), course != null ? course.getTitle() : null,
                    course != null ? course.getStartDate() : null,
                    invoice.getId(), invoice.getInvoiceCode(), invoice.getPaidAt(), invoice.getAmount(),
                    student != null ? student.getId() : null,
                    student != null ? student.getStudentCode() : null,
                    student != null ? student.getFullName()
                            : lead != null ? lead.getFullName() : profile != null ? profile.getFullName() : null,
                    student != null ? student.getEmail()
                            : lead != null ? lead.getEmail() : account != null ? account.getEmail() : null,
                    student != null ? student.getPhone()
                            : lead != null ? lead.getPhone() : profile != null ? profile.getPhone() : null,
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

        Set<Long> studentIds = page.stream().map(Enrollment::getStudentId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> courseIds = page.stream().map(Enrollment::getCourseId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> invoiceIds = page.stream().map(Enrollment::getInvoiceId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> accountIds = page.stream().map(Enrollment::getAccountId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<Long, Student> studentMap = studentRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(Student::getId, s -> s));
        Map<Long, Course> courseMap = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, c -> c));
        Map<Long, Invoice> invoiceMap = invoiceRepository.findAllById(invoiceIds).stream()
                .collect(Collectors.toMap(Invoice::getId, i -> i));
        Map<Long, Account> accountMap = accountRepository.findAllById(accountIds).stream()
                .collect(Collectors.toMap(Account::getId, a -> a));

        return page.map(e -> {
            Student s = e.getStudentId() != null ? studentMap.get(e.getStudentId()) : null;
            Account a = e.getAccountId() != null ? accountMap.get(e.getAccountId()) : null;
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
            long absences = attendanceRepository.countByEnrollmentId(e.getId());
            CompletionEligibility eligibility = includeCompletionEligibility
                    ? evaluateCompletionEligibility(e, c)
                    : new CompletionEligibility(false, null);

            return EnrollmentResponse.from(e, absences, studentName, studentCode, studentEmail, studentPhone,
                    courseTitle, invoiceCode, eligibility.eligible(), eligibility.reason());
        });
    }

    @Override
    @Transactional(readOnly = true)
    public EnrollmentSummaryResponse getSummary() {
        requireAdmin();
        Map<EnrollmentStatus, Long> counts = new EnumMap<>(EnrollmentStatus.class);
        for (EnrollmentStatus status : EnrollmentStatus.values()) counts.put(status, 0L);
        enrollmentRepository.countGroupedByStatus().forEach(row ->
                counts.put((EnrollmentStatus) row[0], ((Number) row[1]).longValue()));
        long awaitingOffline = invoiceRepository.findOfflineEnrollmentCandidates(
                null, InvoiceType.TUITION_PAYMENT, InvoiceStatus.PAID, null, CourseType.OFFLINE,
                PageRequest.of(0, 1)).getTotalElements();
        return new EnrollmentSummaryResponse(
                counts.get(EnrollmentStatus.PENDING), counts.get(EnrollmentStatus.ACTIVE),
                counts.get(EnrollmentStatus.RESERVED), counts.get(EnrollmentStatus.TERMINATED),
                counts.get(EnrollmentStatus.COMPLETED), awaitingOffline);
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
    @Transactional(readOnly = true)
    public SessionAttendanceResponse getSessionAttendance(Long courseId, Long sessionId) {
        Session session = getSession(courseId, sessionId);
        requireCanManageSession(session);
        if (session.getCourse().getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Điểm danh chỉ áp dụng cho khóa OFFLINE");
        }
        List<Long> activeIds = enrollmentRepository.findByCourseIdAndStatus(courseId, EnrollmentStatus.ACTIVE)
                .stream().filter(e -> e.getEnrollmentType() == EnrollmentType.OFFLINE)
                .map(Enrollment::getId).toList();
        List<Long> absentIds = attendanceRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream().map(AttendanceAbsence::getEnrollmentId).toList();
        return new SessionAttendanceResponse(courseId, sessionId, activeIds, absentIds);
    }

    @Override
    @Transactional
    public List<AttendanceAbsenceResponse> replaceSessionAbsences(
            Long courseId, Long sessionId, ReplaceSessionAbsencesRequest request) {
        Session session = getSession(courseId, sessionId);
        requireCanManageSession(session);
        if (session.getCourse().getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Điểm danh chỉ áp dụng cho khóa OFFLINE");
        }
        List<Enrollment> activeEnrollments = enrollmentRepository
                .findByCourseIdAndStatus(courseId, EnrollmentStatus.ACTIVE).stream()
                .filter(e -> e.getEnrollmentType() == EnrollmentType.OFFLINE).toList();
        Set<Long> activeIds = new HashSet<>();
        activeEnrollments.forEach(e -> activeIds.add(e.getId()));
        Set<Long> absentIds = new LinkedHashSet<>(request.getAbsentEnrollmentIds());
        if (absentIds.contains(null) || !activeIds.containsAll(absentIds)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Danh sách vắng chỉ được chứa ghi danh OFFLINE đang ACTIVE trong khóa này");
        }

        Map<Long, AttendanceAbsence> existing = new HashMap<>();
        attendanceRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .forEach(a -> existing.put(a.getEnrollmentId(), a));
        Long actorId = SecurityUtils.requireCurrentAccountId();
        for (Long absentEnrollmentId : absentIds) {
            if (!existing.containsKey(absentEnrollmentId)) {
                AttendanceAbsence absence = new AttendanceAbsence();
                absence.setEnrollmentId(absentEnrollmentId);
                absence.setSessionId(sessionId);
                absence.setCreatedBy(actorId);
                attendanceRepository.save(absence);
            }
        }
        return attendanceRepository.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
                .map(AttendanceAbsenceResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceAbsenceResponse> getAttendanceHistory(Long enrollmentId) {
        Enrollment enrollment = getEnrollment(enrollmentId);
        requireCanView(enrollment);
        return attendanceRepository.findByEnrollmentIdOrderByCreatedAtDesc(enrollmentId).stream()
                .map(AttendanceAbsenceResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentStatusLogResponse> getStatusHistory(Long enrollmentId) {
        Enrollment enrollment = getEnrollment(enrollmentId);
        requireCanView(enrollment);
        return statusLogRepository.findByEnrollmentIdOrderByChangedAtDesc(enrollmentId).stream()
                .map(EnrollmentStatusLogResponse::from).toList();
    }

    private EnrollmentResponse createEnrollment(Invoice invoice, Course course,
            EnrollmentType type, EnrollmentStatus status, Long actorId) {
        if (enrollmentRepository.existsByInvoiceId(invoice.getId())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Hóa đơn này đã được ghi danh");
        }
        ensureCourseCanEnroll(course);
        ensureSeatAvailable(course);
        Enrollment enrollment = new Enrollment();
        enrollment.setEnrollmentType(type);
        enrollment.setAccountId(type == EnrollmentType.ONLINE ? invoice.getAccountId() : null);
        enrollment.setStudentId(type == EnrollmentType.OFFLINE ? invoice.getStudentId() : null);
        enrollment.setCourseId(course.getId());
        enrollment.setInvoiceId(invoice.getId());
        enrollment.setEnrolledBy(actorId);
        enrollment.setStatus(status);
        Enrollment saved = enrollmentRepository.save(enrollment);
        saveStatusLog(saved.getId(), null, status, "Tạo ghi danh từ hóa đơn đã thanh toán", actorId);
        return response(saved);
    }

//    private void validateOnlineCompletion(Enrollment enrollment, Course course) {
//        Long accountId = enrollment.getAccountId();
//        if (accountId == null) {
//            throw new ErrorHandler(HttpStatus.CONFLICT, "Ghi danh ONLINE chưa liên kết tài khoản");
//        }
//        // GIỮ NGUYÊN LOGIC CŨ: Dùng account_id của Progress
//        Progress progress = progressRepository.findByAccount_IdAndCourse_IdAndProgressTypeAndReferenceId(
//                accountId, course.getId(), ProgressScope.COURSE, null)
//                .orElseThrow(() -> new ErrorHandler(HttpStatus.CONFLICT, "Chưa có tiến độ khóa học"));
//        if (progress.getProgressPercentage() == null
//                || progress.getProgressPercentage().compareTo(BigDecimal.valueOf(100)) < 0
//                || Boolean.TRUE.equals(progress.getHasUncompletedNewContent())) {
//            throw new ErrorHandler(HttpStatus.CONFLICT, "Cần hoàn thành 100% nội dung khóa học trước");
//        }
//        List<CourseResource> requiredQuizzes = courseResourceRepository.findByCourse_IdAndIsRequiredTrue(course.getId())
//                .stream().filter(resource -> resource.getResourceType() == ResourceType.QUIZ).toList();
//        for (CourseResource quiz : requiredQuizzes) {
//            Number passed = (Number) entityManager.createNativeQuery("""
//                    SELECT COUNT(*) FROM quiz_attempt
//                    WHERE course_id = :courseId AND resource_id = :resourceId
//                      AND account_id = :accountId AND is_passed = TRUE
//                    """)
//                    .setParameter("courseId", course.getId())
//                    .setParameter("resourceId", quiz.getId())
//                    .setParameter("accountId", accountId)
//                    .getSingleResult();
//            if (passed.longValue() == 0) {
//                throw new ErrorHandler(HttpStatus.CONFLICT,
//                        "Học viên chưa vượt qua bài kiểm tra bắt buộc: " + quiz.getTitle());
//            }
//        }
//    }

//    private CompletionEligibility evaluateCompletionEligibility(Enrollment enrollment, Course course) {
//        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
//            return new CompletionEligibility(false, "Chỉ ghi danh ACTIVE mới được xét hoàn thành");
//        }
//        if (course == null) {
//            return new CompletionEligibility(false, "Không tìm thấy khóa học");
//        }
//        if (course.getStatus() != CourseStatus.FINISHED) {
//            return new CompletionEligibility(false, "Chỉ xét hoàn thành sau khi khóa học kết thúc");
//        }
//        if (course.getCourseType() == CourseType.OFFLINE && enrollment.getFinalScore() == null) {
//            return new CompletionEligibility(false, "Cần ghi nhận điểm cuối khóa trước");
//        }
//        if (course.getCourseType() == CourseType.ONLINE) {
//            try {
//                validateOnlineCompletion(enrollment, course);
//            } catch (ErrorHandler ex) {
//                return new CompletionEligibility(false, ex.getMessage());
//            }
//        }
//        return new CompletionEligibility(true, null);
//    }

    private record CompletionEligibility(boolean eligible, String reason) {}

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
                predicates.add(cb.equal(root.get("enrollmentType"), type));
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
                predicates.add(cb.equal(root.get("accountId"), accountId));
            }
            if (ownerAccountId != null) {
                predicates.add(cb.or(cb.equal(root.get("accountId"), ownerAccountId),
                        cb.equal(root.get("studentId"), ownerStudentId)));
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

                Subquery<Long> accountMatch = query.subquery(Long.class);
                Root<Account> account = accountMatch.from(Account.class);
                accountMatch.select(account.get("id")).where(cb.and(
                        cb.equal(account.get("id"), root.get("accountId")),
                        cb.or(cb.like(cb.lower(account.get("email")), pattern),
                                cb.like(cb.lower(account.get("userProfile").get("fullName")), pattern),
                                cb.like(cb.lower(account.get("userProfile").get("phone")), pattern))));

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

                predicates.add(cb.or(cb.exists(studentMatch), cb.exists(accountMatch),
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
        Account a = e.getAccountId() != null ? accountRepository.findById(e.getAccountId()).orElse(null) : null;
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
        long absences = attendanceRepository.countByEnrollmentId(e.getId());

        return EnrollmentResponse.from(e, absences, studentName, studentCode, studentEmail, studentPhone, courseTitle, invoiceCode);
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
        if (enrollment.getEnrollmentType() != EnrollmentType.OFFLINE) {
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
        boolean ownsAsAccount = accountId.equals(enrollment.getAccountId());
        boolean ownsAsStudent = enrollment.getStudentId() != null
                && studentRepository.findByUserId(accountId)
                        .map(student -> student.getId().equals(enrollment.getStudentId())).orElse(false);
        if (!ownsAsAccount && !ownsAsStudent) {
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
