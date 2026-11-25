package com.ecms_web_application.OC01.service.impl.request;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestSearchRequest;
import com.ecms_web_application.OC01.dto.response.course.CourseConflictDetail;
import com.ecms_web_application.OC01.dto.response.request.RequestConflictPreviewResponse;
import com.ecms_web_application.OC01.dto.response.request.RequestDetailResponse;
import com.ecms_web_application.OC01.dto.response.request.RequestResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.entity.enums.RequestStatus;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.event.RequestReviewedEvent;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.mapper.RequestMapper;
import com.ecms_web_application.OC01.generic.validator.RequestValidator;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.RequestRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.service.CourseConflictService;
import com.ecms_web_application.OC01.service.handler.RequestHandler;
import com.ecms_web_application.OC01.service.handler.RequestHandlerRegistry;
import com.ecms_web_application.OC01.service.request.RequestService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RequestServiceImpl implements RequestService {

    private final RequestRepository requestRepository;
    private final AccountRepository accountRepository;
    private final CourseRepository courseRepository;
    private final SessionRepository sessionRepository;
    private final RequestValidator requestValidator;
    private final RequestMapper requestMapper;
    private final RequestHandlerRegistry handlerRegistry;
    private final ApplicationEventPublisher eventPublisher;
    private final CourseConflictService courseConflictService;

    private static final DateTimeFormatter CODE_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final int MAX_CODE_RETRY = 3;

    // ============================================================
    // CREATE
    // ============================================================
    @Override
    @Transactional
    public RequestDetailResponse create(RequestCreateRequest req) {

        // 1. Parse & validate cơ bản
        RequestType type = RequestType.fromCode(req.getRequestType());
        requestValidator.validateForCreate(req, type);

        // 2. [FIX-RACE] Khoá Course trước khi check trùng để tránh 2 request PENDING
        //    đồng thời được tạo cho cùng course. Lock giữ đến cuối transaction.
        //    Chỉ áp dụng cho COURSE_REVIEW; nếu course không tồn tại (đã bị xoá),
        //    bỏ qua lock → handler.validateCreate sẽ throw 404 với message chuẩn.
        if (type == RequestType.COURSE_REVIEW && req.getTargetEntityId() != null) {
            courseRepository.findByIdForUpdate(req.getTargetEntityId())
                    .ifPresent(c -> log.debug(
                            "[RequestCreate] Locked course {} for COURSE_REVIEW", c.getId()));
        }

        // 3. Handler validate (đã có lock nếu là COURSE_REVIEW — đọc lại sẽ hit persistence context)
        RequestHandler handler = handlerRegistry.get(type);
        handler.validateCreate(req, type);

        // 4. Không cho submit trùng khi đã có PENDING cho cùng target.
        //    LEAVE_FEEDBACK chặn theo (enrollmentId, sessionId) vì một buổi học
        //    có nhiều học viên, không thể chặn chéo giữa các học viên.
        String targetType = type.getTargetEntityType();
        if (!"NONE".equals(targetType)) {
            if (type == RequestType.LEAVE_FEEDBACK) {
                Long enrollmentId = extractEnrollmentId(req.getPayload());
                if (enrollmentId == null) {
                    throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                            "Đơn xin nghỉ phép phải kèm enrollmentId");
                }
                boolean exists = requestRepository
                        .findAllByRequestTypeAndTargetEntityTypeAndTargetEntityIdAndStatus(
                                type, targetType, req.getTargetEntityId(), RequestStatus.PENDING)
                        .stream()
                        .anyMatch(pending -> enrollmentId.equals(extractEnrollmentId(pending.getPayload())));
                if (exists) {
                    throw new ErrorHandler(HttpStatus.CONFLICT,
                            "Đã có đơn xin nghỉ đang chờ duyệt cho buổi học này");
                }
            } else {
                boolean exists = requestRepository
                        .existsByRequestTypeAndTargetEntityTypeAndTargetEntityIdAndStatus(
                                type, targetType, req.getTargetEntityId(), RequestStatus.PENDING);
                if (exists) {
                    throw new ErrorHandler(HttpStatus.CONFLICT,
                            "Đã có yêu cầu '" + type.getDisplayName()
                                    + "' đang chờ duyệt cho đối tượng này");
                }
            }
        }

        // 5. Build entity
        Long requesterId = SecurityUtils.requireCurrentAccountId();

        Request r = new Request();
        r.setRequestCode(generateRequestCode());
        r.setRequestType(type);
        r.setRequesterId(requesterId);
        r.setTargetEntityType(targetType);
        r.setTargetEntityId(req.getTargetEntityId());
        r.setTitle(req.getTitle().trim());
        r.setDescription(req.getDescription());
        r.setPayload(req.getPayload() != null ? req.getPayload() : new HashMap<>());
        r.setStatus(RequestStatus.PENDING);

        Request saved = requestRepository.save(r);

        // 6. onCreate hook — side-effect sau save (vd DRAFT → PENDING_REVIEW)
        handler.onCreate(saved, req);

        log.info("[Request] CREATED code={}, type={}, target={}#{}, requesterId={}",
                saved.getRequestCode(), type.getCode(),
                targetType, saved.getTargetEntityId(), requesterId);

        return toDetailWithAccounts(saved);
    }

    // ============================================================
    // GET BY ID
    // ============================================================
    @Override
    public RequestDetailResponse getById(Long id) {
        Request r = requestRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Yêu cầu không tồn tại"));
        assertCanView(r, SecurityUtils.requireCurrentAccountId());
        return toDetailWithAccounts(r);
    }

    // ============================================================
    // SEARCH
    // ============================================================
    @Override
    public Page<RequestResponse> search(RequestSearchRequest filter, Pageable pageable) {

        RequestType type = (filter.getRequestType() == null || filter.getRequestType().isBlank())
                ? null : RequestType.fromCode(filter.getRequestType());
        RequestType excludeType =
                (filter.getExcludeRequestType() == null || filter.getExcludeRequestType().isBlank())
                        ? null : RequestType.fromCode(filter.getExcludeRequestType());
        RequestStatus status = (filter.getStatus() == null || filter.getStatus().isBlank())
                ? null : RequestStatus.fromCode(filter.getStatus());
        String keyword = (filter.getKeyword() == null) ? "" : filter.getKeyword().trim();

        LocalDateTime fromDate = filter.getFromDate() != null
                ? filter.getFromDate()
                : LocalDateTime.of(1970, 1, 1, 0, 0, 0);

        LocalDateTime toDate = filter.getToDate() != null
                ? filter.getToDate()
                : LocalDateTime.of(9999, 12, 31, 23, 59, 59);

        Page<Request> page = requestRepository.search(
                type, excludeType, status,
                filter.getRequesterId(),
                filter.getTargetEntityType(),
                filter.getTargetEntityId(),
                keyword,
                fromDate,
                toDate,
                pageable);

        return mapPageWithAccounts(page);
    }

    // ============================================================
    // PREVIEW COURSE CONFLICTS
    // ============================================================
    @Override
    public RequestConflictPreviewResponse previewCourseConflicts(Long requestId) {

        Request r = requestRepository.findById(requestId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Yêu cầu không tồn tại"));

        if (r.getRequestType() != RequestType.COURSE_REVIEW) {
            return RequestConflictPreviewResponse.builder()
                    .requestId(r.getId())
                    .hasConflicts(false)
                    .conflictCount(0)
                    .message("Loại yêu cầu không cần check conflict")
                    .build();
        }

        if (r.getTargetEntityId() == null) {
            return RequestConflictPreviewResponse.builder()
                    .requestId(r.getId())
                    .hasConflicts(false)
                    .conflictCount(0)
                    .message("Yêu cầu không có target course")
                    .build();
        }

        Course course = courseRepository.findById(r.getTargetEntityId()).orElse(null);
        if (course == null) {
            return RequestConflictPreviewResponse.builder()
                    .requestId(r.getId())
                    .hasConflicts(false)
                    .conflictCount(0)
                    .message("Không tìm thấy khóa học target")
                    .build();
        }

        List<CourseConflictDetail> conflicts =
                courseConflictService.checkCourseConflict(course);

        String message;
        if (conflicts.isEmpty()) {
            message = "Không phát hiện trùng lịch với khóa học nào khác";
        } else {
            message = "Phát hiện " + conflicts.size()
                    + " khóa học có lịch trùng — vui lòng điều chỉnh lịch "
                    + "(giảng viên/phòng/giờ) trước khi duyệt";
        }

        return RequestConflictPreviewResponse.builder()
                .requestId(r.getId())
                .targetCourseId(course.getId())
                .targetCourseTitle(course.getTitle())
                .hasConflicts(!conflicts.isEmpty())
                .conflictCount(conflicts.size())
                .conflicts(conflicts)
                .message(message)
                .build();
    }

    // ============================================================
    // REVIEW (approve / reject)
    // ============================================================
    @Override
    @Transactional
    public RequestDetailResponse review(Long id, RequestReviewRequest req) {

        requestValidator.validateForReview(req);

        Request r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Yêu cầu không tồn tại"));

        if (r.getStatus() != RequestStatus.PENDING) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Chỉ duyệt yêu cầu đang PENDING (hiện tại: " + r.getStatus() + ")");
        }

        Long reviewerId = SecurityUtils.requireCurrentAccountId();
        assertCanApprove(reviewerId, r);

        RequestHandler handler = handlerRegistry.get(r.getRequestType());

        if (Boolean.TRUE.equals(req.getApproved())) {
            r.setStatus(RequestStatus.APPROVED);
            handler.onApprove(r, req);
        } else {
            r.setStatus(RequestStatus.REJECTED);
            r.setRejectReason(req.getNote().trim());
            handler.onReject(r, req);
        }

        LocalDateTime now = LocalDateTime.now();
        r.setResolvedAt(now);
        r.setResolvedBy(reviewerId);

        Map<String, Object> merged = new HashMap<>();
        if (r.getResponseData() != null) merged.putAll(r.getResponseData());
        if (req.getResponseData() != null) merged.putAll(req.getResponseData());
        if (req.getNote() != null) merged.putIfAbsent("note", req.getNote());
        if (!merged.isEmpty()) r.setResponseData(merged);

        Request saved = requestRepository.save(r);

        eventPublisher.publishEvent(new RequestReviewedEvent(
                saved.getId(), Boolean.TRUE.equals(req.getApproved())));

        log.info("[Request] {} code={}, type={}, by={}",
                saved.getStatus(), saved.getRequestCode(),
                saved.getRequestType().getCode(), reviewerId);

        return toDetailWithAccounts(saved);
    }

    // ============================================================
    // CANCEL
    // ============================================================
    @Override
    @Transactional
    public RequestDetailResponse cancel(Long id) {

        Request r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Yêu cầu không tồn tại"));

        Long me = SecurityUtils.requireCurrentAccountId();
        requestValidator.validateForCancel(me.equals(r.getRequesterId()));

        if (r.getStatus() != RequestStatus.PENDING) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Chỉ hủy yêu cầu đang PENDING (hiện tại: " + r.getStatus() + ")");
        }

        r.setStatus(RequestStatus.CANCELLED);
        r.setResolvedAt(LocalDateTime.now());

        handlerRegistry.get(r.getRequestType()).onCancel(r);

        Request saved = requestRepository.save(r);

        log.info("[Request] CANCELLED code={}, type={}, by={}",
                saved.getRequestCode(), saved.getRequestType().getCode(), me);

        return toDetailWithAccounts(saved);
    }

    // ============================================================
    // REVOKE — thu hồi đơn đã duyệt (hoàn tác side-effect)
    // ============================================================
    @Override
    @Transactional
    public RequestDetailResponse revoke(Long id) {

        Request r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Yêu cầu không tồn tại"));

        if (r.getRequestType() != RequestType.LEAVE_FEEDBACK) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Chỉ đơn xin nghỉ mới hỗ trợ thu hồi");
        }
        if (r.getStatus() != RequestStatus.APPROVED) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Chỉ thu hồi đơn đã được duyệt (hiện tại: " + r.getStatus() + ")");
        }

        Long actorId = SecurityUtils.requireCurrentAccountId();
        assertCanRevoke(actorId, r);

        Map<String, Object> responseData = r.getResponseData();
        boolean hasAttendanceSnapshot = responseData != null
                && responseData.get("attendancePreviousStatus") != null;
        boolean attendanceSkipped = responseData != null
                && Boolean.TRUE.equals(responseData.get("attendanceSkipped"));
        if (!hasAttendanceSnapshot && !attendanceSkipped) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Đơn này không có dữ liệu điểm danh trước khi duyệt — "
                            + "không thể thu hồi tự động. Vui lòng sửa điểm danh thủ công.");
        }

        // Handler hoàn tác điểm danh trong khi request còn APPROVED
        handlerRegistry.get(r.getRequestType()).onCancel(r);

        r.setStatus(RequestStatus.CANCELLED);
        r.setResolvedAt(LocalDateTime.now());

        Map<String, Object> merged = new HashMap<>();
        if (r.getResponseData() != null) merged.putAll(r.getResponseData());
        merged.put("revokedAt", LocalDateTime.now().toString());
        merged.put("revokedBy", actorId);
        r.setResponseData(merged);

        Request saved = requestRepository.save(r);

        log.info("[Request] REVOKED code={}, type={}, by={}",
                saved.getRequestCode(), saved.getRequestType().getCode(), actorId);

        return toDetailWithAccounts(saved);
    }

    // ============================================================
    // HELPERS
    // ============================================================
    private String generateRequestCode() {
        String date = LocalDate.now().format(CODE_DATE_FMT);
        long count = requestRepository.countByCreatedAtBetween(
                LocalDate.now().atStartOfDay(),
                LocalDate.now().plusDays(1).atStartOfDay());

        for (int i = 0; i < MAX_CODE_RETRY; i++) {
            String code = String.format("REQ-%s-%04d", date, count + 1 + i);
            if (requestRepository.findByRequestCode(code).isEmpty()) {
                return code;
            }
        }
        return String.format("REQ-%s-%s", date,
                UUID.randomUUID().toString().substring(0, 4).toUpperCase());
    }

    private Long extractEnrollmentId(Map<String, Object> payload) {
        if (payload == null) return null;
        Object val = payload.get("enrollmentId");
        if (val == null) return null;
        if (val instanceof Number num) return num.longValue();
        try {
            return Long.parseLong(val.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void assertCanView(Request r, Long accountId) {
        if (accountId.equals(r.getRequesterId())) return;
        if (accountId.equals(r.getResolvedBy())) return;

        Account acc = accountRepository.findByIdWithRoleAndProfile(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED,
                        "Account không tồn tại"));

        if (acc.isAdmin()) return;

        RequestType type = r.getRequestType();
        String requiredRole = (type != null) ? type.getApproverRoleCode() : null;
        if (requiredRole != null && acc.getRole() != null
                && requiredRole.equals(acc.getRole().getCode())) {
            return;
        }
        throw new ErrorHandler(HttpStatus.FORBIDDEN,
                "Bạn không có quyền xem yêu cầu này");
    }

    private void assertCanApprove(Long accountId, Request r) {
        RequestType type = r.getRequestType();
        String requiredRole = (type != null) ? type.getApproverRoleCode() : null;
        if (requiredRole == null) return;

        Account acc = accountRepository.findByIdWithRoleAndProfile(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED,
                        "Account không tồn tại"));

        // §2.3: đơn xin nghỉ buổi học chỉ do GIẢNG VIÊN PHỤ TRÁCH buổi đó xử lý.
        // ADMIN không duyệt thay (chỉ xem điểm danh).
        if (type == RequestType.LEAVE_FEEDBACK) {
            if (!acc.isInstructor()) {
                throw new ErrorHandler(HttpStatus.FORBIDDEN,
                        "Chỉ giảng viên phụ trách buổi học mới được duyệt đơn nghỉ");
            }
            if (!isAssignedToSession(r.getTargetEntityId(), accountId)) {
                throw new ErrorHandler(HttpStatus.FORBIDDEN,
                        "Bạn không được phân công buổi học này nên không thể duyệt đơn nghỉ");
            }
            return;
        }

        if (acc.isAdmin()) return;

        if (acc.getRole() == null || !requiredRole.equals(acc.getRole().getCode())) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN,
                    "Chỉ " + requiredRole + " mới được duyệt yêu cầu này");
        }
    }

    /** Chỉ giảng viên được phân công buổi học được thu hồi đơn đã duyệt; ADMIN không có quyền. */
    private void assertCanRevoke(Long accountId, Request r) {
        Account acc = accountRepository.findByIdWithRoleAndProfile(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED,
                        "Account không tồn tại"));
        if (acc.isInstructor() && isAssignedToSession(r.getTargetEntityId(), accountId)) return;

        throw new ErrorHandler(HttpStatus.FORBIDDEN,
                "Chỉ giảng viên được phân công buổi học mới có quyền thu hồi đơn nghỉ");
    }

    private boolean isAssignedToSession(Long sessionId, Long accountId) {
        if (sessionId == null) return false;
        return sessionRepository.findById(sessionId)
                .map(session -> matchesSessionAssignment(session, accountId))
                .orElse(false);
    }

    private boolean matchesSessionAssignment(Session session, Long accountId) {
        return (session.getCourse() != null && session.getCourse().getTeacher() != null
                    && accountId.equals(session.getCourse().getTeacher().getId()))
                || (session.getTeacher() != null && accountId.equals(session.getTeacher().getId()))
                || (session.getSubstituteTeacher() != null
                    && accountId.equals(session.getSubstituteTeacher().getId()))
                || (session.getAssistant() != null && accountId.equals(session.getAssistant().getId()));
    }

    private RequestDetailResponse toDetailWithAccounts(Request r) {
        Set<Long> ids = new HashSet<>();
        if (r.getRequesterId() != null) ids.add(r.getRequesterId());
        if (r.getResolvedBy() != null) ids.add(r.getResolvedBy());

        Map<Long, Account> accountMap = ids.isEmpty()
                ? Map.of()
                : accountRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Account::getId, a -> a));

        return requestMapper.toDetailResponse(r, accountMap);
    }

    private Page<RequestResponse> mapPageWithAccounts(Page<Request> page) {
        Set<Long> ids = requestMapper.collectAccountIds(page.getContent());
        Map<Long, Account> accountMap = ids.isEmpty()
                ? Map.of()
                : accountRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Account::getId, a -> a));

        return page.map(r -> requestMapper.toResponse(r, accountMap));
    }
}