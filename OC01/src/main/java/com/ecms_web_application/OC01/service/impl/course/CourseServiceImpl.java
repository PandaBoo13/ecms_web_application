package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.course.*;
import com.ecms_web_application.OC01.dto.response.course.*;
import com.ecms_web_application.OC01.entity.*;
import com.ecms_web_application.OC01.entity.enums.*;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.mapper.CourseModuleMapper;
import com.ecms_web_application.OC01.generic.validator.CourseValidator;
import com.ecms_web_application.OC01.repository.*;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.CourseConflictService;
import com.ecms_web_application.OC01.service.CourseService;
import com.ecms_web_application.OC01.service.SessionService;
import com.ecms_web_application.OC01.service.handler.RequestHandlerRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.CourseResource;
import com.ecms_web_application.OC01.entity.course.Question;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseResourceRepository resourceRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final RoomRepository roomRepository;
    private final QuestionRepository questionRepository;
    private final AuditLogService auditLogService;
    private final SessionService sessionService;
    private final SessionRepository sessionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentStatusLogRepository enrollmentStatusLogRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final CourseValidator courseValidator;
    private final CourseModuleMapper mapper; // Thay thế CourseMapper cũ
    private final CourseConflictService courseConflictService;
    private final RequestRepository requestRepository;
    private final RequestHandlerRegistry requestHandlerRegistry;

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");

    // ============================================================
    // CREATE
    // ============================================================
    @Override
    @Transactional
    public CourseResponse create(CourseCreateRequest request) {
        courseValidator.validateForCreate(request);
        Account current = SecurityUtils.requireCurrentAccount();
        String typeCode = (request.getCourseType() == CourseType.OFFLINE) ? "OFF" : "ONL";
        String code = generateCode(typeCode);
        String slug = generateUniqueSlug(slugify(request.getTitle()), null);

        Course c = new Course();
        c.setCode(code);
        c.setSlug(slug);
        c.setDisplayCode(code);
        c.setTitle(request.getTitle().trim());
        c.setShortDescription(request.getShortDescription());
        c.setDescription(request.getDescription());
        c.setThumbnailUrl(request.getThumbnailUrl());
        c.setOutcomes(request.getOutcomes());
        c.setCertificateTypeId(request.getCertificateTypeId());
        c.setCertificateConfig(request.getCertificateConfig());

        String learningMode = StringUtils.hasText(request.getLearningMode())
                ? request.getLearningMode()
                : (request.getCourseType() == CourseType.OFFLINE ? "SEQUENTIAL" : "AUTONOMOUS");
        c.setLearningMode(learningMode);

        c.setAllowedRoomIds(request.getAllowedRoomIds());
        c.setTotalSessionsExpected(request.getTotalSessionsExpected());
        c.setPrice(request.getPrice() == null ? BigDecimal.ZERO : request.getPrice());
        c.setOldPrice(request.getOldPrice());
        c.setIsFree(Boolean.TRUE.equals(request.getIsFree()));
        c.setCourseType(request.getCourseType());
        c.setProgressType(request.getCourseType() == CourseType.OFFLINE
                ? ProgressType.SESSION_BASED : ProgressType.COMPLETION_BASED);
        c.setStatus(CourseStatus.DRAFT);
        c.setTeacher(resolveTeacher(request.getTeacherId(), current));
        c.setCreatedBy(current);
        if (request.getCategoryId() != null) {
            c.setCategory(categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Danh mục không tồn tại")));
        }
        if (request.getRoomId() != null) {
            c.setRoom(roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại")));
        }

        Course saved = courseRepository.save(c);
        auditLogService.log("CREATE", "COURSE", saved.getId(), "Tạo khóa: " + saved.getTitle());
        log.info("Tạo course id={}, code={}", saved.getId(), saved.getCode());
        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // GET BY ID
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public CourseDetailResponse getById(Long id) {
        Course c = courseRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        List<CourseResource> resources = resourceRepository.findByCourse_IdOrderByOrderIndexAsc(id);
        return mapper.toCourseDetailResponse(c, resources);
    }

    // ============================================================
    // SEARCH
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public Page<CourseResponse> search(String status, String type, Long teacherId,
                                       Long categoryId, String search, Pageable pageable) {
        CourseStatus st = StringUtils.hasText(status) ? CourseStatus.valueOf(status.toUpperCase()) : null;
        CourseType tp = StringUtils.hasText(type) ? CourseType.valueOf(type.toUpperCase()) : null;
        String kw = StringUtils.hasText(search) ? search.trim() : "";

        return courseRepository.searchCourses(st, tp, teacherId, categoryId, kw, pageable)
                .map(mapper::toCourseResponse);
    }

    // ============================================================
    // UPDATE (nội dung — chỉ DRAFT)
    // ============================================================
    @Override
    @Transactional
    public CourseResponse update(Long id, CourseUpdateRequest request) {
        courseValidator.validateForUpdate(request);
        Course c = getCourseOrThrow(id);
        assertCanEditContent(c);

        if (StringUtils.hasText(request.getTitle())) {
            c.setTitle(request.getTitle().trim());
            c.setSlug(generateUniqueSlug(slugify(request.getTitle()), id));
        }
        if (request.getShortDescription() != null) {
            if (request.getShortDescription().length() > 500) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Mô tả ngắn không vượt quá 500 ký tự");
            }
            c.setShortDescription(request.getShortDescription());
        }
        if (request.getDescription() != null) c.setDescription(request.getDescription());
        if (request.getThumbnailUrl() != null) c.setThumbnailUrl(request.getThumbnailUrl());
        if (request.getOutcomes() != null) c.setOutcomes(request.getOutcomes());
        if (request.getCertificateTypeId() != null) c.setCertificateTypeId(request.getCertificateTypeId());
        if (request.getCertificateConfig() != null) c.setCertificateConfig(request.getCertificateConfig());
        if (request.getLearningMode() != null)    c.setLearningMode(request.getLearningMode());
        if (request.getAllowedRoomIds() != null)  c.setAllowedRoomIds(request.getAllowedRoomIds());
        if (request.getTotalSessionsExpected() != null) c.setTotalSessionsExpected(request.getTotalSessionsExpected());
        if (request.getPrice() != null) {
            if (request.getPrice().signum() < 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Giá phải >= 0");
            }
            c.setPrice(request.getPrice());
        }
        if (request.getOldPrice() != null) c.setOldPrice(request.getOldPrice());
        if (request.getIsFree() != null) c.setIsFree(request.getIsFree());
        if (request.getCategoryId() != null) {
            c.setCategory(categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Danh mục không tồn tại")));
        }
        if (request.getRoomId() != null) {
            c.setRoom(roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại")));
        }

        Course saved = courseRepository.save(c);
        auditLogService.log("UPDATE", "COURSE", id, "Cập nhật khóa học");
        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // UPDATE OFFLINE INFO (cấu hình lịch — DRAFT hoặc PLANNED)
    // ============================================================
    @Override
    @Transactional
    public CourseResponse updateOfflineInfo(Long id, CourseOfflineInfoRequest request) {
        courseValidator.validateForOfflineInfo(request);
        Course c = getCourseOrThrow(id);
        assertCanEditOfflineInfo(c);

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : c.getStartDate();
        LocalDate endDate   = request.getEndDate()   != null ? request.getEndDate()   : c.getEndDate();
        Integer minStudents = request.getMinStudents() != null ? request.getMinStudents() : c.getMinStudents();
        Integer maxStudents = request.getMaxStudents() != null ? request.getMaxStudents() : c.getMaxStudents();
        LocalTime startTime = request.getSessionStartTime() != null ? request.getSessionStartTime() : c.getSessionStartTime();
        LocalTime endTime   = request.getSessionEndTime()   != null ? request.getSessionEndTime()   : c.getSessionEndTime();

        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Ngày bắt đầu phải <= ngày kết thúc");
        }
        if (minStudents != null && maxStudents != null && maxStudents < minStudents) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "max_students phải >= min_students");
        }
        if (startTime != null && endTime != null && !startTime.isBefore(endTime)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "session_start_time phải < session_end_time");
        }

        if (request.getMinStudents() != null) c.setMinStudents(request.getMinStudents());
        if (request.getMaxStudents() != null) c.setMaxStudents(request.getMaxStudents());
        if (request.getStartDate() != null) c.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) c.setEndDate(request.getEndDate());
        if (request.getScheduleDays() != null) c.setScheduleDays(request.getScheduleDays());
        if (request.getSessionStartTime() != null) c.setSessionStartTime(request.getSessionStartTime());
        if (request.getSessionEndTime() != null) c.setSessionEndTime(request.getSessionEndTime());

        c.setCourseType(CourseType.OFFLINE);
        c.setProgressType(ProgressType.SESSION_BASED);
        if (c.getLearningMode() == null) c.setLearningMode("SEQUENTIAL");

        if (request.getTeacherId() != null) {
            c.setTeacher(accountRepository.findById(request.getTeacherId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại")));
        }
        if (request.getRoomId() != null) {
            c.setRoom(roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại")));
        }

        Course saved = courseRepository.save(c);
        auditLogService.log("UPDATE_OFFLINE", "COURSE", id, "Cập nhật cấu hình OFFLINE");
        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // SUBMIT FOR REVIEW
    // ============================================================
    @Override
    @Transactional
    public CourseResponse submitForReview(Long id) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ submit khóa ở DRAFT (hiện tại: " + c.getStatus() + ")");
        }
        boolean hasPending = requestRepository
                .existsByRequestTypeAndTargetEntityTypeAndTargetEntityIdAndStatus(
                        RequestType.COURSE_REVIEW, "COURSE", id, RequestStatus.PENDING);
        if (hasPending) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Đã có yêu cầu kiểm duyệt đang chờ cho khóa học này");
        }
        validateBeforeSubmit(c);
        c.setStatus(CourseStatus.PENDING_REVIEW);
        Course saved = courseRepository.save(c);
        auditLogService.log("SUBMIT_REVIEW", "COURSE", id, null);
        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // WITHDRAW REVIEW
    // ============================================================
    @Override
    @Transactional
    public void withdrawReviewRequest(Long courseId) {
        Course c = getCourseOrThrow(courseId);
        if (c.getStatus() != CourseStatus.PENDING_REVIEW) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ thu hồi được khi COURSE đang PENDING_REVIEW (hiện tại: " + c.getStatus() + ")");
        }

        Request pendingRequest = requestRepository.findLatestByTargetAndTypeAndStatus(
                        "COURSE", courseId, RequestType.COURSE_REVIEW, RequestStatus.PENDING)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu kiểm duyệt đang chờ cho khóa học này"));

        Long currentId = SecurityUtils.requireCurrentAccountId();
        boolean isRequester = currentId.equals(pendingRequest.getRequesterId());
        boolean isAdmin = SecurityUtils.hasRole("ADMIN");
        if (!isRequester && !isAdmin) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ người gửi yêu cầu hoặc ADMIN mới được thu hồi");
        }

        pendingRequest.setStatus(RequestStatus.CANCELLED);
        pendingRequest.setResolvedAt(LocalDateTime.now());
        pendingRequest.setResolvedBy(currentId);
        requestRepository.save(pendingRequest);

        requestHandlerRegistry.get(pendingRequest.getRequestType()).onCancel(pendingRequest);

        auditLogService.log("WITHDRAW_REVIEW", "COURSE", courseId, "Thu hồi yêu cầu kiểm duyệt code=" + pendingRequest.getRequestCode());
        log.info("[Course] Withdraw review courseId={}, requestId={}, by={}", courseId, pendingRequest.getId(), currentId);
    }

    // ============================================================
    // REVIEW
    // ============================================================
    @Override
    @Transactional
    public CourseResponse review(Long id, CourseReviewRequest request) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.PENDING_REVIEW) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ duyệt khóa ở PENDING_REVIEW");
        }
        if (Boolean.TRUE.equals(request.getApproved())) {
            c.setStatus(CourseStatus.PUBLISHED);
        } else {
            if (!StringUtils.hasText(request.getRejectReason())) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lý do từ chối là bắt buộc");
            }
            c.setStatus(CourseStatus.DRAFT);
        }
        Course saved = courseRepository.save(c);
        auditLogService.log(Boolean.TRUE.equals(request.getApproved()) ? "APPROVE" : "REJECT",
                "COURSE", id, request.getRejectReason());
        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // ARCHIVE
    // ============================================================
    @Override
    @Transactional
    public CourseResponse archive(Long id) {
        Course c = getCourseOrThrow(id);
        c.setStatus(CourseStatus.ARCHIVED);
        Course saved = courseRepository.save(c);
        auditLogService.log("ARCHIVE", "COURSE", id, null);
        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // CANCEL
    // ============================================================
    @Override
    @Transactional
    public CourseResponse cancel(Long id, String reason) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() == CourseStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khóa đã bị hủy");
        }
        if (!StringUtils.hasText(reason)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Lý do hủy là bắt buộc");
        }
        c.setStatus(CourseStatus.CANCELLED);
        Course saved = courseRepository.save(c);

        List<Enrollment> active = new ArrayList<>();
        active.addAll(enrollmentRepository.findByCourseIdAndStatus(id, EnrollmentStatus.PENDING));
        active.addAll(enrollmentRepository.findByCourseIdAndStatus(id, EnrollmentStatus.ACTIVE));
        active.addAll(enrollmentRepository.findByCourseIdAndStatus(id, EnrollmentStatus.RESERVED));

        Long actorId = SecurityUtils.getCurrentAccountId();
        LocalDateTime now = LocalDateTime.now();

        for (Enrollment e : active) {
            EnrollmentStatus oldStatus = e.getStatus();
            e.setStatus(EnrollmentStatus.TERMINATED);
            e.setTerminationReason("Khóa học bị hủy: " + reason);
            e.setTerminatedAt(now);
            e.setTerminatedBy(actorId);
            enrollmentRepository.save(e);

            EnrollmentStatusLog logEntry = new EnrollmentStatusLog();
            logEntry.setEnrollmentId(e.getId());
            logEntry.setOldStatus(oldStatus);
            logEntry.setNewStatus(EnrollmentStatus.TERMINATED);
            logEntry.setReason("Khóa học bị hủy: " + reason);
            logEntry.setChangedBy(actorId);
            enrollmentStatusLogRepository.save(logEntry);
        }
        log.info("[Course] CANCELLED courseId={}, terminated {} enrollments", id, active.size());

        auditLogService.log("CANCEL", "COURSE", id, reason);
        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // COPY
    // ============================================================
    @Override
    @Transactional
    public CourseDetailResponse copy(Long sourceCourseId, CourseCopyRequest request) {
        Course src = courseRepository.findByIdWithRelations(sourceCourseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa gốc không tồn tại"));
        if (courseRepository.existsByDisplayCode(request.getNewDisplayCode())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "display_code đã tồn tại");
        }
        Account current = SecurityUtils.requireCurrentAccount();
        String typeCode = src.getCourseType() == CourseType.OFFLINE ? "OFF" : "ONL";
        String code = generateCode(typeCode);
        String slug = generateUniqueSlug(slugify(request.getNewTitle()), null);

        Course copy = new Course();
        copy.setCode(code);
        copy.setSlug(slug);
        copy.setDisplayCode(request.getNewDisplayCode());
        copy.setTitle(request.getNewTitle());
        copy.setShortDescription(src.getShortDescription());
        copy.setDescription(src.getDescription());
        copy.setThumbnailUrl(src.getThumbnailUrl());
        copy.setOutcomes(src.getOutcomes());
        copy.setLearningMode(src.getLearningMode());
        copy.setAllowedRoomIds(src.getAllowedRoomIds());
        copy.setTotalSessionsExpected(src.getTotalSessionsExpected());
        copy.setPrice(Boolean.TRUE.equals(request.getResetPrice()) ? BigDecimal.ZERO : src.getPrice());
        copy.setOldPrice(src.getOldPrice());
        copy.setIsFree(src.getIsFree());
        copy.setCourseType(src.getCourseType());
        copy.setProgressType(src.getProgressType());
        copy.setStatus(CourseStatus.DRAFT);
        copy.setCategory(src.getCategory());
        copy.setTeacher(src.getTeacher());
        copy.setCreatedBy(current);
        copy.setCopiedFromCourseId(src.getId());
        Course savedCopy = courseRepository.save(copy);

        Map<Long, CourseResource> idMap = new HashMap<>();
        for (CourseResource srcR : resourceRepository.findByCourse_IdOrderByOrderIndexAsc(src.getId())) {
            CourseResource newParent = srcR.getParent() != null ? idMap.get(srcR.getParent().getId()) : null;
            CourseResource newR = mapper.cloneResource(srcR, savedCopy, newParent, current);
            idMap.put(srcR.getId(), resourceRepository.save(newR));
        }

        List<Question> srcQuestions = questionRepository.findByCourse_Id(src.getId());
        for (Question sq : srcQuestions) {
            CourseResource newLesson = sq.getLesson() != null ? idMap.get(sq.getLesson().getId()) : null;
            Question nq = mapper.cloneQuestion(sq, savedCopy, newLesson);
            questionRepository.save(nq);
        }
        auditLogService.log("COPY", "COURSE", savedCopy.getId(), "Copy từ course " + src.getId());
        log.info("Copy course {} → {}", src.getId(), savedCopy.getId());
        return getById(savedCopy.getId());
    }

    // ============================================================
    // SOFT / HARD DELETE
    // ============================================================
    @Override
    @Transactional
    public void softDelete(Long id) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.ARCHIVED && c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ xóa mềm khóa DRAFT/ARCHIVED");
        }
        c.setDeletedAt(LocalDateTime.now());
        courseRepository.save(c);
        auditLogService.log("SOFT_DELETE", "COURSE", id, null);
    }

    @Override
    @Transactional
    public void hardDelete(Long id) {
        Course c = getCourseOrThrow(id);
        if (c.getStatus() != CourseStatus.DRAFT) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ xóa cứng khóa DRAFT");
        }
        courseRepository.delete(c);
        auditLogService.log("HARD_DELETE", "COURSE", id, null);
    }

    // ============================================================
    // CHANGE TEACHER
    // ============================================================
    @Override
    @Transactional
    public CourseResponse changeTeacher(Long courseId, Long newTeacherId) {
        Course c = getCourseOrThrow(courseId);
        if (c.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ đổi GV chính cho khóa OFFLINE");
        }
        assertCanChangeTeacher(c);

        sessionService.changeCourseMainTeacher(courseId, newTeacherId);
        Course updated = getCourseOrThrow(courseId);
        return mapper.toCourseResponse(updated);
    }

    // ============================================================
    // FINALIZE SCHEDULE
    // ============================================================
    @Transactional
    @Override
    public CourseResponse finalizeSchedule(Long courseId) {
        Course c = getCourseOrThrow(courseId);

        if (c.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "finalizeSchedule chỉ áp dụng cho khóa OFFLINE");
        }
        if (c.getStatus() != CourseStatus.PLANNED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ finalize khóa ở PLANNED (hiện tại: " + c.getStatus() + ")");
        }

        if (c.getTeacher() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu giảng viên chính");
        }
        boolean hasRoom = c.getRoom() != null
                || (c.getAllowedRoomIds() != null && !c.getAllowedRoomIds().isEmpty());
        if (!hasRoom) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu phòng học");
        }
        if (c.getStartDate() == null || c.getEndDate() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu start_date / end_date");
        }
        if (c.getScheduleDays() == null || c.getScheduleDays().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu schedule_days");
        }
        if (c.getSessionStartTime() == null || c.getSessionEndTime() == null
                || !c.getSessionStartTime().isBefore(c.getSessionEndTime())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Giờ học không hợp lệ");
        }
        if (c.getMinStudents() == null || c.getMaxStudents() == null
                || c.getMaxStudents() < c.getMinStudents()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "min/max students không hợp lệ");
        }
        if (c.getTotalSessionsExpected() == null || c.getTotalSessionsExpected() <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Thiếu total_sessions_expected");
        }

        List<com.ecms_web_application.OC01.entity.course.Session> sessions =
                sessionRepository.findByCourse_IdOrderBySessionNumberAsc(courseId);

        if (sessions.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chưa có session nào — cần generate-sessions trước");
        }

        List<Long> missingRoom = new ArrayList<>();
        List<Long> missingTeacher = new ArrayList<>();
        for (var s : sessions) {
            if (s.getStatus() == SessionStatus.CANCELLED) continue;
            boolean hasSessionRoom = s.getRoom() != null || s.getEffectiveRoomId() != null;
            if (!hasSessionRoom) missingRoom.add(s.getId());
            if (s.getTeacher() == null) missingTeacher.add(s.getId());
        }
        if (!missingRoom.isEmpty() || !missingTeacher.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Thiếu room/teacher. missingRoom=" + missingRoom + ", missingTeacher=" + missingTeacher);
        }

        List<CourseConflictDetail> conflicts = courseConflictService.checkSessionConflict(courseId);

        if (!conflicts.isEmpty()) {
            String detail = conflicts.stream()
                    .limit(5)
                    .map(cf -> {
                        String types = String.join("+", cf.getConflictTypes());
                        return "Buổi " + cf.getConflictingSessionNumber() + " (" + types + "): trùng course '" + cf.getConflictingCourseTitle() + "'";
                    })
                    .collect(Collectors.joining(" | "));
            if (conflicts.size() > 5) {
                detail += " | ... và " + (conflicts.size() - 5) + " conflict khác";
            }

            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Không thể finalize → PUBLISHED. Có " + conflicts.size()
                            + " session bị TRÙNG lịch với course khác: " + detail
                            + ". Vui lòng điều chỉnh lịch (GV/phòng) trước khi finalize.");
        }

        int scheduled = 0;
        for (var s : sessions) {
            if (s.getStatus() == SessionStatus.DRAFT) {
                s.setStatus(SessionStatus.SCHEDULED);
                sessionRepository.save(s);
                scheduled++;
            }
        }

        c.setStatus(CourseStatus.PUBLISHED);
        Course saved = courseRepository.save(c);

        auditLogService.log("FINALIZE_SCHEDULE", "COURSE", courseId,
                "scheduled " + scheduled + "/" + sessions.size() + " sessions → PUBLISHED");
        log.info("[Course] finalizeSchedule courseId={}, {} sessions → SCHEDULED, course → PUBLISHED", courseId, scheduled);

        return mapper.toCourseResponse(saved);
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================
    private Course getCourseOrThrow(Long id) {
        return courseRepository.findById(id)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
    }

    private void assertCanEditContent(Course c) {
        if (c.getStatus() != CourseStatus.DRAFT) {
            String hint = (c.getStatus() == CourseStatus.PENDING_REVIEW)
                    ? " Vui lòng thu hồi yêu cầu kiểm duyệt (POST /api/courses/" + c.getId() + "/withdraw-review) trước khi sửa."
                    : (c.getStatus() == CourseStatus.PLANNED
                    ? " Khóa đã duyệt nội dung — không thể sửa. Nếu cần sửa, hãy tạo bản nháp mới từ chức năng Nhân bản."
                    : "");
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ sửa nội dung khóa học ở trạng thái DRAFT (hiện tại: " + c.getStatus() + ")." + hint);
        }
    }

    private void assertCanEditOfflineInfo(Course c) {
        if (c.getStatus() != CourseStatus.DRAFT && c.getStatus() != CourseStatus.PLANNED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ cấu hình lịch học ở DRAFT hoặc PLANNED (hiện tại: " + c.getStatus() + ")");
        }
    }

    private void assertCanChangeTeacher(Course c) {
        if (c.getStatus() != CourseStatus.DRAFT && c.getStatus() != CourseStatus.PLANNED && c.getStatus() != CourseStatus.PUBLISHED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ đổi GV chính khi khóa ở DRAFT/PLANNED/PUBLISHED (hiện tại: " + c.getStatus() + ")");
        }
    }

    private Account resolveTeacher(Long teacherId, Account current) {
        if (teacherId != null) {
            return accountRepository.findById(teacherId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Giảng viên không tồn tại"));
        }
        return current;
    }

    private void validateBeforeSubmit(Course c) {
        if (c.getPrice().signum() <= 0 && !Boolean.TRUE.equals(c.getIsFree())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Giá phải > 0 hoặc is_free = true");
        }
        if (c.getCourseType() == CourseType.ONLINE) {
            long chapters = resourceRepository.countByCourse_IdAndResourceType(c.getId(), ResourceType.CHAPTER);
            if (chapters == 0) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Cần ít nhất 1 Chapter");
            }
        }
    }

    private String generateCode(String typeCode) {
        String ym = DateTimeFormatter.ofPattern("yyyyMM").format(LocalDate.now());
        long count = courseRepository.count() + 1;
        return String.format("CRS-%s-%s-%03d", typeCode, ym, count);
    }

    private String generateUniqueSlug(String base, Long excludeId) {
        String s = base;
        int i = 1;
        while (excludeId == null ? courseRepository.existsBySlug(s) : courseRepository.existsBySlugAndIdNot(s, excludeId)) {
            s = base + "-" + i++;
        }
        return s;
    }

    private String slugify(String input) {
        if (input == null) return "";
        String temp = Normalizer.normalize(input, Normalizer.Form.NFD);
        temp = temp.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        temp = temp.replaceAll("đ", "d").replaceAll("Đ", "D");
        temp = temp.toLowerCase(Locale.ROOT);
        temp = NON_ALNUM.matcher(temp).replaceAll("-");
        return temp.replaceAll("^-+|-+$", "");
    }

    @Override
    public List<EnrolledCourseResponse> getMyEnrolledCourses(Long accountId) {
        // Gọi native query
        List<Object[]> results = courseRepository.findMyEnrolledCourses(accountId);

        return results.stream().map(row -> {
            // 1. Ép kiểu an toàn cho ID (Postgres thường trả về BigInteger)
            Long enrollmentId = row[0] != null ? ((Number) row[0]).longValue() : null;
            Long courseId = row[1] != null ? ((Number) row[1]).longValue() : null;

            // 2. Lấy các chuỗi
            String courseCode = (String) row[2];
            String courseTitle = (String) row[3];
            String thumbnailUrl = (String) row[4];
            String enrollmentStatus = (String) row[5];

            // 3. Ép kiểu thời gian (Postgres trả về Timestamp)
            LocalDateTime enrolledAt = row[6] != null
                    ? ((Timestamp) row[6]).toLocalDateTime()
                    : null;

            // 4. Ép kiểu số thực (BigDecimal hoặc Double)
            Double progressPercentage = row[7] != null
                    ? ((Number) row[7]).doubleValue()
                    : 0.0;

            return EnrolledCourseResponse.builder()
                    .enrollmentId(enrollmentId)
                    .courseId(courseId)
                    .courseCode(courseCode)
                    .courseTitle(courseTitle)
                    .thumbnailUrl(thumbnailUrl)
                    .enrollmentStatus(enrollmentStatus)
                    .enrolledAt(enrolledAt)
                    .progressPercentage(progressPercentage)
                    .build();
        }).toList();
    }
}