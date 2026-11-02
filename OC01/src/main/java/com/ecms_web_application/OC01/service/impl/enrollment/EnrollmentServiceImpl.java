package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReplaceSessionAbsencesRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceAbsenceResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentStatusLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.SessionAttendanceResponse;
import com.ecms_web_application.OC01.entity.*;
import com.ecms_web_application.OC01.entity.enums.*;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.*;
import com.ecms_web_application.OC01.service.EnrollmentService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.course.Progress;
import com.ecms_web_application.OC01.entity.course.Session;

@Service
@RequiredArgsConstructor
public class EnrollmentServiceImpl implements EnrollmentService {
    private static final List<EnrollmentStatus> SEAT_HOLDING_STATUSES = List.of(EnrollmentStatus.PENDING,
            EnrollmentStatus.ACTIVE);

    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentStatusLogRepository statusLogRepository;
    private final AttendanceAbsenceRepository attendanceRepository;
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final SessionRepository sessionRepository;
    private final CourseResourceRepository courseResourceRepository;
    private final ProgressRepository progressRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional
    public EnrollmentResponse createOffline(Long invoiceId) {
        requireAdmin();
        Invoice invoice = getInvoice(invoiceId);
        validatePaidTuitionInvoice(invoice);
        if (invoice.getStudentId() == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Cần có hồ sơ học viên trước khi tạo ghi danh OFFLINE");
        }
        Course course = lockAndGetCourse(invoice.getCourseId());
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Hóa đơn này không thuộc khóa OFFLINE");
        }
        return createEnrollment(invoice, course, EnrollmentType.OFFLINE,
                course.getStartDate() != null && !course.getStartDate().isAfter(LocalDate.now())
                        ? EnrollmentStatus.ACTIVE
                        : EnrollmentStatus.PENDING,
                SecurityUtils.requireCurrentAccountId());
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
    public Page<EnrollmentResponse> search(EnrollmentType type, EnrollmentStatus status, Long courseId,
            Long studentId, Long accountId, Pageable pageable) {
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
        return enrollmentRepository.search(type, status, courseId, studentId, accountId,
                ownerAccountId, ownerStudentId, pageable)
                .map(e -> EnrollmentResponse.from(e, attendanceRepository.countByEnrollmentId(e.getId())));
    }

    @Override
    @Transactional(readOnly = true)
    public EnrollmentResponse getById(Long enrollmentId) {
        Enrollment enrollment = getEnrollment(enrollmentId);
        requireCanView(enrollment);
        return EnrollmentResponse.from(enrollment,
                attendanceRepository.countByEnrollmentId(enrollment.getId()));
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
        Enrollment enrollment = getEnrollmentForUpdate(enrollmentId);
        if (enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ ghi danh ACTIVE mới được xét hoàn thành");
        }
        Course course = courseRepository.findById(enrollment.getCourseId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
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
            EnrollmentType type, EnrollmentStatus status,
            Long actorId) {
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

    private void validateOnlineCompletion(Enrollment enrollment, Course course) {
        Long accountId = enrollment.getAccountId();
        if (accountId == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Ghi danh ONLINE chưa liên kết tài khoản");
        }
        Progress progress = progressRepository.findByAccount_IdAndCourse_IdAndProgressTypeAndReferenceId(
                accountId, course.getId(), ProgressScope.COURSE, null)
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
                      AND account_id = :accountId AND is_passed = TRUE
                    """)
                    .setParameter("courseId", course.getId())
                    .setParameter("resourceId", quiz.getId())
                    .setParameter("accountId", accountId)
                    .getSingleResult();
            if (passed.longValue() == 0) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Học viên chưa vượt qua bài kiểm tra bắt buộc: " + quiz.getTitle());
            }
        }
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

    private void touch(Enrollment enrollment) {
        enrollment.setUpdatedAt(LocalDateTime.now());
        enrollment.setUpdatedBy(SecurityUtils.requireCurrentAccountId());
    }

    private EnrollmentResponse saveResponse(Enrollment enrollment) {
        return response(enrollmentRepository.save(enrollment));
    }

    private EnrollmentResponse response(Enrollment enrollment) {
        return EnrollmentResponse.from(enrollment,
                attendanceRepository.countByEnrollmentId(enrollment.getId()));
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
