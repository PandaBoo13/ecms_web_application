package com.ecms_web_application.OC01.service.request.impl;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestSearchRequest;
import com.ecms_web_application.OC01.dto.response.request.RequestDetailResponse;
import com.ecms_web_application.OC01.dto.response.request.RequestResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.enums.RequestStatus;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.event.RequestReviewedEvent;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.mapper.RequestMapper;
import com.ecms_web_application.OC01.generic.validator.RequestValidator;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.RequestRepository;
import com.ecms_web_application.OC01.service.request.RequestService;
import com.ecms_web_application.OC01.service.request.handler.RequestHandler;
import com.ecms_web_application.OC01.service.request.handler.RequestHandlerRegistry;
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
    private final RequestValidator requestValidator;
    private final RequestMapper requestMapper;
    private final RequestHandlerRegistry handlerRegistry;
    private final ApplicationEventPublisher eventPublisher;

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

        // 2. Handler validate (query DB: target phải tồn tại + state hợp lệ)
        RequestHandler handler = handlerRegistry.get(type);
        handler.validateCreate(req, type);

        // 3. Không cho submit trùng khi đã có PENDING cho cùng target
        String targetType = type.getTargetEntityType();
        if (!"NONE".equals(targetType)) {
            boolean exists = requestRepository
                    .existsByRequestTypeAndTargetEntityTypeAndTargetEntityIdAndStatus(
                            type, targetType, req.getTargetEntityId(), RequestStatus.PENDING);
            if (exists) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Đã có yêu cầu '" + type.getDisplayName()
                                + "' đang chờ duyệt cho đối tượng này");
            }
        }

        // 4. Build entity
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

        // 5. onCreate hook — side-effect sau save (vd DRAFT → PENDING_REVIEW)
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
        RequestStatus status = (filter.getStatus() == null || filter.getStatus().isBlank())
                ? null : RequestStatus.fromCode(filter.getStatus());
        String keyword = (filter.getKeyword() == null) ? "" : filter.getKeyword().trim();

        Page<Request> page = requestRepository.search(
                type, status,
                filter.getRequesterId(),
                filter.getTargetEntityType(),
                filter.getTargetEntityId(),
                keyword,
                filter.getFromDate(),
                filter.getToDate(),
                pageable);

        return mapPageWithAccounts(page);
    }

    // ============================================================
    // REVIEW (approve / reject)
    // ============================================================
    @Override
    @Transactional
    public RequestDetailResponse review(Long id, RequestReviewRequest req) {

        // 1. Validate payload review
        requestValidator.validateForReview(req);

        // 2. Lock row để tránh 2 admin duyệt đồng thời
        Request r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Yêu cầu không tồn tại"));

        if (r.getStatus() != RequestStatus.PENDING) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Chỉ duyệt yêu cầu đang PENDING (hiện tại: " + r.getStatus() + ")");
        }

        // 3. Check quyền
        Long reviewerId = SecurityUtils.requireCurrentAccountId();
        assertCanApprove(reviewerId, r);

        // 4. Dispatch handler side-effect
        RequestHandler handler = handlerRegistry.get(r.getRequestType());

        if (Boolean.TRUE.equals(req.getApproved())) {
            r.setStatus(RequestStatus.APPROVED);
            handler.onApprove(r, req);
        } else {
            r.setStatus(RequestStatus.REJECTED);
            r.setRejectReason(req.getNote().trim());
            handler.onReject(r, req);
        }

        // 5. Fill resolved metadata
        LocalDateTime now = LocalDateTime.now();
        r.setResolvedAt(now);
        r.setResolvedBy(reviewerId);

        // 6. Merge responseData
        Map<String, Object> merged = new HashMap<>();
        if (r.getResponseData() != null) merged.putAll(r.getResponseData());
        if (req.getResponseData() != null) merged.putAll(req.getResponseData());
        if (req.getNote() != null) merged.putIfAbsent("note", req.getNote());
        if (!merged.isEmpty()) r.setResponseData(merged);

        Request saved = requestRepository.save(r);

        // 7. Publish event → notification listener gửi thông báo cho requester
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
    // HELPERS
    // ============================================================

    /**
     * Sinh mã request dạng REQ-yyyyMMdd-XXXX.
     * Retry tối đa MAX_CODE_RETRY nếu trùng. Fallback dùng UUID nếu vẫn trùng.
     */
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

    /**
     * Chỉ requester, resolver, ADMIN, hoặc role có approverRoleCode mới xem được.
     */
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

    /**
     * Chỉ ADMIN hoặc role đúng với approverRoleCode mới được duyệt.
     * approverRoleCode == null → bất kỳ authenticated user đều duyệt được.
     */
    private void assertCanApprove(Long accountId, Request r) {
        RequestType type = r.getRequestType();
        String requiredRole = (type != null) ? type.getApproverRoleCode() : null;
        if (requiredRole == null) return;

        Account acc = accountRepository.findByIdWithRoleAndProfile(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.UNAUTHORIZED,
                        "Account không tồn tại"));

        if (acc.isAdmin()) return;

        if (acc.getRole() == null || !requiredRole.equals(acc.getRole().getCode())) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN,
                    "Chỉ " + requiredRole + " mới được duyệt yêu cầu này");
        }
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