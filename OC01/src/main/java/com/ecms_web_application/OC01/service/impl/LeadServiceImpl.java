package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.LeadAssignRequest;
import com.ecms_web_application.OC01.dto.request.LeadCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadInteractionCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadPlacementTestCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadUpdateRequest;
import com.ecms_web_application.OC01.dto.request.PublicLeadRegisterRequest;
import com.ecms_web_application.OC01.dto.response.LeadDetailResponse;
import com.ecms_web_application.OC01.dto.response.LeadInteractionResponse;
import com.ecms_web_application.OC01.dto.response.LeadPlacementTestResponse;
import com.ecms_web_application.OC01.dto.response.LeadResponse;
import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.LeadAssignmentLog;
import com.ecms_web_application.OC01.entity.LeadInteraction;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.dto.response.ConsultantResponse;
import com.ecms_web_application.OC01.dto.response.ConsultantPerformanceResponse;
import com.ecms_web_application.OC01.dto.response.LeadStatisticsResponse;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadAssignmentLogRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.NotificationRecipientRepository;
import com.ecms_web_application.OC01.service.LeadService;
import com.ecms_web_application.OC01.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadServiceImpl implements LeadService {

    private static final List<InvoiceStatus> ACTIVE_INVOICE_STATUSES = List.of(
            InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE);

    private final LeadRepository leadRepository;
    private final LeadAssignmentLogRepository assignmentLogRepository;
    private final AccountRepository accountRepository;
    private final InvoiceRepository invoiceRepository;
    private final CourseRepository courseRepository;
    private final NotificationService notificationService;
    private final NotificationRecipientRepository notificationRecipientRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional(readOnly = true)
    public Page<LeadResponse> search(String search, String status, Long courseId, Long sourceId, Long consultantId,
            Boolean inQueue, Boolean hasOpenInvoice, Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                    Sort.by("createdAt").descending());
        }
        // Nếu người dùng là role LEAD hoặc CONSULTANT (Tư vấn viên), tự động chỉ xem khách hàng được
        // giao cho mình
        if (SecurityUtils.hasRole("LEAD") || SecurityUtils.hasRole("CONSULTANT")) {
            consultantId = SecurityUtils.getCurrentAccountId();
            inQueue = false;
        }

        Map<Long, ConsultantResponse> consultantMap = getConsultantMap();
        Page<Lead> leads = leadRepository.searchLeads(
                emptyToNull(status), courseId, consultantId, inQueue, hasOpenInvoice,
                InvoiceType.TUITION_PAYMENT, ACTIVE_INVOICE_STATUSES, emptyToNull(search), pageable);

        Set<Long> leadIds = new HashSet<>();
        leads.getContent().forEach(lead -> leadIds.add(lead.getId()));

        Set<Long> leadIdsWithInvoice = new HashSet<>();
        if (!leadIds.isEmpty()) {
            leadIdsWithInvoice.addAll(invoiceRepository.findLeadIdsWithActiveInvoice(
                    leadIds, InvoiceType.TUITION_PAYMENT, ACTIVE_INVOICE_STATUSES));
        }
        return leads.map(lead -> {
            LeadResponse response = toResponse(lead, consultantMap);
            response.setHasOpenInvoice(leadIdsWithInvoice.contains(lead.getId()));
            return response;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public LeadResponse getById(Long id) {
        Lead lead = findLeadById(id);
        return toResponse(lead, hasOpenInvoice(lead.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public LeadDetailResponse getDetailById(Long id) {
        Lead lead = findLeadById(id);
        LeadDetailResponse detail = new LeadDetailResponse();
        copyPropertiesToResponse(lead, detail, getConsultantMap());
        detail.setHasOpenInvoice(hasOpenInvoice(lead.getId()));

        List<LeadInteractionResponse> interactions = getInteractions(id);
        List<LeadPlacementTestResponse> placementTests = getPlacementTests(id);
        List<LeadAssignmentLog> assignmentLogs = assignmentLogRepository.findByLeadIdOrderByChangedAtDesc(id);

        detail.setInteractions(interactions);
        detail.setPlacementTests(placementTests);
        detail.setAssignmentLogs(assignmentLogs);
        detail.setStatusLogs(new ArrayList<>());
        return detail;
    }

    @Override
    @Transactional
    public LeadResponse create(LeadCreateRequest request) {
        Lead lead = new Lead();
        lead.setFullName(request.getFullName().trim());

        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        if (email == null || email.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Email không được để trống");
        }
        lead.setEmail(email);

        String phone = emptyToNull(request.getPhone());
        if (phone == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Số điện thoại không được để trống");
        }
        lead.setPhone(phone);

        if (request.getCourseId() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Khóa học quan tâm (courseId) là bắt buộc");
        }
        lead.setCourseId(request.getCourseId());

        String sourceName = (request.getSourceName() != null && !request.getSourceName().isBlank())
                ? request.getSourceName().trim()
                : "Website";
        lead.setSourceName(sourceName);

        String channelType = (request.getChannelType() != null && !request.getChannelType().isBlank())
                ? request.getChannelType().trim().toUpperCase()
                : "ONLINE";
        lead.setChannelType(channelType);

        if (request.getAssignedConsultantId() != null) {
            validateConsultant(request.getAssignedConsultantId());
        }
        lead.setAssignedConsultantId(request.getAssignedConsultantId());
        lead.setNote(emptyToNull(request.getNote()));

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().trim().toUpperCase()
                : "NEW";
        if (!"NEW".equals(status) && !"CONSULTED".equals(status)) {
            status = "NEW";
        }
        lead.setStatus(status);
        if ("CONSULTED".equals(status)) {
            lead.setConsultedAt(LocalDateTime.now());
        } else {
            lead.setConsultedAt(null);
        }
        lead.setInteractions(new ArrayList<>());

        Lead saved = leadRepository.save(lead);
        Long currentUserId = SecurityUtils.getCurrentAccountId();

        // Ghi log phân công nếu đã chọn người phụ trách ban đầu
        if (saved.getAssignedConsultantId() != null) {
            recordAssignmentLog(saved.getId(), null, saved.getAssignedConsultantId(), "Phân công tư vấn viên ban đầu",
                    currentUserId);
        }

        // Bắn thông báo Realtime đến Admin & Tư vấn viên
        notifyNewLead(saved);

        log.info("Tạo mới Lead id={}, fullName={}, status={}", saved.getId(), saved.getFullName(), saved.getStatus());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public Long registerPublicLead(PublicLeadRegisterRequest request) {
        // Email/phone: cột NOT NULL trong DB, nhưng form công khai chỉ bắt buộc MỘT
        // trong hai
        // → thiếu field nào thì lưu chuỗi rỗng (khách sẽ được liên hệ qua field còn
        // lại).
        String email = (request.getEmail() == null) ? "" : request.getEmail().trim().toLowerCase();
        String phone = (request.getPhone() == null) ? "" : request.getPhone().trim();
        if (email.isEmpty() && phone.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập ít nhất Số điện thoại hoặc Email để liên hệ");
        }

        // Khóa học phải tồn tại và chưa bị xóa mềm (form chỉ hiển thị khóa hợp lệ)
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Khóa học không tồn tại hoặc đã bị gỡ"));
        if (course.getDeletedAt() != null) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND,
                    "Khóa học không tồn tại hoặc đã bị gỡ");
        }

        Lead lead = new Lead();
        lead.setFullName(request.getFullName().trim());
        lead.setEmail(email);
        lead.setPhone(phone);
        lead.setCourseId(course.getId());
        lead.setSourceName("Website - Tư vấn");
        lead.setChannelType("ONLINE");
        lead.setStatus("NEW");
        String note = emptyToNull(request.getNote());
        lead.setNote(note != null ? note : "Khách đăng ký nhận tư vấn khóa học '" + course.getTitle() + "'");
        lead.setInteractions(new ArrayList<>());

        Lead saved = leadRepository.save(lead);
        notifyNewLead(saved);
        log.info("Đăng ký tư vấn công khai: leadId={}, courseId={}, cóEmail={}, cóPhone={}",
                saved.getId(), saved.getCourseId(), !email.isEmpty(), !phone.isEmpty());
        return saved.getId();
    }

    @Override
    @Transactional
    public LeadResponse update(Long id, LeadUpdateRequest request) {
        Lead lead = findLeadById(id);
        Long currentUserId = SecurityUtils.getCurrentAccountId();

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            lead.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            lead.setEmail(request.getEmail().trim().toLowerCase());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            lead.setPhone(request.getPhone().trim());
        }
        if (request.getCourseId() != null) {
            lead.setCourseId(request.getCourseId());
        }
        if (request.getSourceName() != null && !request.getSourceName().isBlank()) {
            lead.setSourceName(request.getSourceName().trim());
        }
        if (request.getChannelType() != null && !request.getChannelType().isBlank()) {
            lead.setChannelType(request.getChannelType().trim().toUpperCase());
        }
        if (request.getStudentId() != null) {
            lead.setStudentId(request.getStudentId());
        }
        if (request.getNote() != null) {
            lead.setNote(emptyToNull(request.getNote()));
        }

        // Xử lý thay đổi phân công
        if (request.getAssignedConsultantId() != null
                && !Objects.equals(request.getAssignedConsultantId(), lead.getAssignedConsultantId())) {
            Long oldConsultantId = lead.getAssignedConsultantId();
            lead.setAssignedConsultantId(request.getAssignedConsultantId());
            recordAssignmentLog(lead.getId(), oldConsultantId, request.getAssignedConsultantId(),
                    "Cập nhật người phụ trách", currentUserId);
        }

        // Xử lý thay đổi trạng thái (Bất biến: KHÔNG lùi từ CONSULTED về NEW)
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            String newStatus = request.getStatus().trim().toUpperCase();
            String oldStatus = lead.getStatus();
            if ("CONSULTED".equalsIgnoreCase(oldStatus) && "NEW".equalsIgnoreCase(newStatus)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Quy tắc nghiệp vụ: Không được phép chuyển lùi trạng thái Lead từ CONSULTED về NEW");
            }
            if (!newStatus.equalsIgnoreCase(oldStatus)) {
                lead.setStatus(newStatus);
                if ("CONSULTED".equals(newStatus)) {
                    lead.setConsultedAt(LocalDateTime.now());
                } else {
                    lead.setConsultedAt(null);
                }
            }
        }

        Lead saved = leadRepository.save(lead);
        log.info("Cập nhật Lead id={}, status={}", saved.getId(), saved.getStatus());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public LeadResponse assignConsultant(Long id, LeadAssignRequest request) {
        Lead lead = findLeadById(id);
        Long oldConsultantId = lead.getAssignedConsultantId();
        Long newConsultantId = request.getConsultantId();

        if (newConsultantId != null) {
            validateConsultant(newConsultantId);
        }

        lead.setAssignedConsultantId(newConsultantId);
        Lead saved = leadRepository.save(lead);

        Long currentUserId = SecurityUtils.getCurrentAccountId();
        String reason = (request.getReason() != null && !request.getReason().isBlank())
                ? request.getReason()
                : "Chuyển phân công tư vấn viên";
        recordAssignmentLog(saved.getId(), oldConsultantId, newConsultantId, reason, currentUserId);

        log.info("Phân công Lead id={} từ consultant={} sang consultant={}", id, oldConsultantId, newConsultantId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public LeadInteractionResponse logInteraction(Long id, LeadInteractionCreateRequest request) {
        Lead lead = findLeadById(id);

        String result = request.getResult().trim().toUpperCase();
        if ("REJECTED".equalsIgnoreCase(result) || "TỪ CHỐI".equalsIgnoreCase(result)) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Quy tắc nghiệp vụ: Bắt buộc cung cấp lý do từ chối (rejectReason) khi kết quả tư vấn là Từ chối");
            }
        }

        Long currentUserId = SecurityUtils.getCurrentAccountId();

        if (lead.getInteractions() == null) {
            lead.setInteractions(new ArrayList<>());
        }

        LeadInteraction interaction = new LeadInteraction();
        interaction.setId((long) (lead.getInteractions().size() + 1));
        interaction.setLeadId(id);
        interaction.setInteractionType(request.getInteractionType().trim().toUpperCase());
        interaction.setNotes(emptyToNull(request.getNotes()));
        interaction.setResult(result);
        interaction.setRejectReason(emptyToNull(request.getRejectReason()));
        interaction.setPerformedBy(currentUserId);
        interaction.setCreatedAt(LocalDateTime.now());

        lead.getInteractions().add(interaction);

        // Bất biến: Nếu Lead đang ở trạng thái NEW -> tự động chuyển sang CONSULTED
        if ("NEW".equalsIgnoreCase(lead.getStatus())) {
            lead.setStatus("CONSULTED");
            lead.setConsultedAt(LocalDateTime.now());
            log.info("Tự động chuyển trạng thái Lead id={} từ NEW sang CONSULTED", id);
        }

        leadRepository.save(lead);
        return toInteractionResponse(interaction);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeadInteractionResponse> getInteractions(Long id) {
        Lead lead = findLeadById(id);
        if (lead.getInteractions() == null) {
            return Collections.emptyList();
        }
        return lead.getInteractions().stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null)
                        return 0;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .map(this::toInteractionResponse)
                .toList();
    }

    @Override
    @Transactional
    public LeadPlacementTestResponse recordPlacementTest(Long id, LeadPlacementTestCreateRequest request) {
        Lead lead = findLeadById(id);
        String testStatus = request.getTestStatus().trim().toUpperCase();

        if ("COMPLETED".equals(testStatus)) {
            if (request.getTestScore() == null) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Điểm đánh giá (testScore) là bắt buộc khi trạng thái là COMPLETED");
            }
            lead.setPlacementTestStatus("COMPLETED");
            lead.setPlacementTestScore(request.getTestScore());
            lead.setPlacementRecommendedLevel(emptyToNull(request.getRecommendedLevel()));
            lead.setPlacementTestNotes(emptyToNull(request.getNotes()));
            lead.setPlacementEvaluatedAt(
                    request.getEvaluatedAt() != null ? request.getEvaluatedAt() : LocalDateTime.now());
        } else if ("REFUSED".equals(testStatus) || "NO_SHOW".equals(testStatus)) {
            lead.setPlacementTestStatus(testStatus);
            lead.setPlacementTestScore(null);
            String notes = emptyToNull(request.getNotes());
            if (notes == null) {
                notes = "REFUSED".equals(testStatus) ? "Khách hàng từ chối làm bài kiểm tra" : "Khách hàng vắng mặt";
            }
            lead.setPlacementTestNotes(notes);
            lead.setPlacementRecommendedLevel(null);
            lead.setPlacementEvaluatedAt(
                    request.getEvaluatedAt() != null ? request.getEvaluatedAt() : LocalDateTime.now());
        } else {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Trạng thái đánh giá đầu vào chỉ chấp nhận: COMPLETED, REFUSED, NO_SHOW");
        }

        lead.setPlacementTestCreatedAt(LocalDateTime.now());
        Lead saved = leadRepository.save(lead);
        log.info("Ghi nhận đánh giá đầu vào cho Lead id={}, status={}", id, saved.getPlacementTestStatus());
        return toPlacementTestResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeadPlacementTestResponse> getPlacementTests(Long id) {
        Lead lead = findLeadById(id);
        if (lead.getPlacementTestStatus() == null) {
            return Collections.emptyList();
        }
        return List.of(toPlacementTestResponse(lead));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsultantResponse> getConsultants() {
        List<Account> all = new ArrayList<>(accountRepository.findByRoleCode("LEAD"));
        all.addAll(accountRepository.findByRoleCode("CONSULTANT"));
        return all.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsActive()) && a.getDeletedAt() == null)
                .distinct()
                .map(a -> new ConsultantResponse(
                        a.getId(),
                        a.getUserProfile() != null && a.getUserProfile().getFullName() != null
                                && !a.getUserProfile().getFullName().isBlank()
                                        ? a.getUserProfile().getFullName()
                                        : a.getEmail(),
                        a.getEmail()))
                .toList();
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Lead lead = findLeadById(id);
        if ("NEW".equalsIgnoreCase(lead.getStatus())) {
            lead.setStatus("CONSULTED");
            lead.setConsultedAt(LocalDateTime.now());
            leadRepository.save(lead);
        }
        log.info("Đã cập nhật đóng tư vấn Lead id={}", id);
    }

    // ===== Private Helper Methods =====

    private Lead findLeadById(Long id) {
        return leadRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy Lead với ID: " + id));
    }

    private void recordAssignmentLog(Long leadId, Long oldConsultantId, Long newConsultantId, String reason,
            Long changedBy) {
        LeadAssignmentLog logEntity = new LeadAssignmentLog();
        logEntity.setLeadId(leadId);
        logEntity.setOldConsultantId(oldConsultantId);
        logEntity.setNewConsultantId(newConsultantId);
        logEntity.setReason(reason);
        logEntity.setChangedBy(changedBy);
        logEntity.setChangedByType(changedBy != null ? "USER" : "SYSTEM");
        logEntity.setChangedAt(LocalDateTime.now());
        assignmentLogRepository.save(logEntity);
    }

    private void validateConsultant(Long consultantId) {
        if (consultantId == null) {
            return;
        }
        com.ecms_web_application.OC01.entity.Account consultant = accountRepository.findById(consultantId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.BAD_REQUEST, "Tư vấn viên không tồn tại"));
        String roleCode = consultant.getRole() != null ? consultant.getRole().getCode() : "";
        boolean isConsultantRole = "LEAD".equalsIgnoreCase(roleCode) || "CONSULTANT".equalsIgnoreCase(roleCode);
        if (!isConsultantRole || !Boolean.TRUE.equals(consultant.getIsActive())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tài khoản không phải là tư vấn viên hợp lệ của trung tâm");
        }
    }

    private Map<Long, ConsultantResponse> getConsultantMap() {
        return getConsultants().stream()
                .collect(Collectors.toMap(ConsultantResponse::getId, c -> c, (a, b) -> a));
    }

    private void copyPropertiesToResponse(Lead lead, LeadResponse response,
            Map<Long, ConsultantResponse> consultantMap) {
        response.setId(lead.getId());
        response.setFullName(lead.getFullName());
        response.setEmail(lead.getEmail());
        response.setPhone(lead.getPhone());
        response.setCourseId(lead.getCourseId());
        response.setStudentId(lead.getStudentId());
        response.setStatus(lead.getStatus());
        response.setConsultedAt(lead.getConsultedAt());
        response.setConvertedAt(lead.getConvertedAt());
        response.setSourceName(lead.getSourceName());
        response.setChannelType(lead.getChannelType());
        response.setSourceId(lead.getSourceId());
        response.setAssignedConsultantId(lead.getAssignedConsultantId());
        if (lead.getAssignedConsultantId() != null) {
            ConsultantResponse c = consultantMap != null ? consultantMap.get(lead.getAssignedConsultantId()) : null;
            if (c != null) {
                response.setAssignedConsultantName(c.getName());
                response.setAssignedConsultantEmail(c.getEmail());
            } else {
                accountRepository.findByIdWithRoleAndProfile(lead.getAssignedConsultantId()).ifPresent(acc -> {
                    String name = acc.getUserProfile() != null && acc.getUserProfile().getFullName() != null
                            && !acc.getUserProfile().getFullName().isBlank()
                                    ? acc.getUserProfile().getFullName()
                                    : acc.getEmail();
                    response.setAssignedConsultantName(name);
                    response.setAssignedConsultantEmail(acc.getEmail());
                });
            }
        }
        response.setNote(lead.getNote());
        response.setPlacementTestStatus(lead.getPlacementTestStatus());
        response.setPlacementTestScore(lead.getPlacementTestScore());
        response.setPlacementRecommendedLevel(lead.getPlacementRecommendedLevel());
        response.setPlacementTestNotes(lead.getPlacementTestNotes());
        response.setPlacementEvaluatedAt(lead.getPlacementEvaluatedAt());
        response.setPlacementTestCreatedAt(lead.getPlacementTestCreatedAt());
        response.setCreatedAt(lead.getCreatedAt());
        response.setUpdatedAt(lead.getUpdatedAt());
    }

    private LeadResponse toResponse(Lead lead) {
        return toResponse(lead, getConsultantMap());
    }

    private LeadResponse toResponse(Lead lead, Map<Long, ConsultantResponse> consultantMap) {
        LeadResponse response = new LeadResponse();
        copyPropertiesToResponse(lead, response, consultantMap);
        response.setHasOpenInvoice(false);
        return response;
    }

    private LeadResponse toResponse(Lead lead, boolean hasOpenInvoice) {
        LeadResponse response = toResponse(lead);
        response.setHasOpenInvoice(hasOpenInvoice);
        return response;
    }

    private boolean hasOpenInvoice(Long leadId) {
        return !invoiceRepository.findLeadIdsWithActiveInvoice(
                List.of(leadId), InvoiceType.TUITION_PAYMENT, ACTIVE_INVOICE_STATUSES).isEmpty();
    }

    private LeadInteractionResponse toInteractionResponse(LeadInteraction interaction) {
        LeadInteractionResponse response = new LeadInteractionResponse();
        response.setId(interaction.getId());
        response.setLeadId(interaction.getLeadId());
        response.setInteractionType(interaction.getInteractionType());
        response.setNotes(interaction.getNotes());
        response.setResult(interaction.getResult() != null ? interaction.getResult() : "INTERESTED");
        response.setRejectReason(interaction.getRejectReason());
        response.setPerformedBy(interaction.getPerformedBy());
        response.setCreatedAt(interaction.getCreatedAt());
        return response;
    }

    private LeadPlacementTestResponse toPlacementTestResponse(Lead lead) {
        LeadPlacementTestResponse response = new LeadPlacementTestResponse();
        response.setId(lead.getId());
        response.setLeadId(lead.getId());
        response.setTestStatus(lead.getPlacementTestStatus());
        response.setScheduledAt(lead.getPlacementTestCreatedAt());
        response.setTestScore(lead.getPlacementTestScore());
        response.setRecommendedLevel(lead.getPlacementRecommendedLevel());
        response.setNotes(lead.getPlacementTestNotes());
        response.setEvaluatedAt(lead.getPlacementEvaluatedAt());
        response.setCreatedAt(
                lead.getPlacementTestCreatedAt() != null ? lead.getPlacementTestCreatedAt() : lead.getCreatedAt());
        return response;
    }

    private void notifyNewLead(Lead lead) {
        try {
            String courseTitle = "Khóa học #" + lead.getCourseId();
            if (lead.getCourseId() != null) {
                var cOpt = courseRepository.findById(lead.getCourseId());
                if (cOpt.isPresent() && cOpt.get().getTitle() != null) {
                    courseTitle = cOpt.get().getTitle();
                }
            }

            String source = (lead.getSourceName() != null && !lead.getSourceName().isBlank())
                    ? lead.getSourceName()
                    : "Website";

            String content = String.format("Khách hàng %s (SĐT: %s) vừa đăng ký tư vấn %s qua %s.",
                    lead.getFullName(), lead.getPhone(), courseTitle, source);

            NotificationRequest.NotificationRequestBuilder notiBuilder = NotificationRequest.builder()
                    .notificationType("LEAD")
                    .title("Khách hàng mới đăng ký tư vấn")
                    .content(content)
                    .referenceType("LEAD")
                    .referenceId(lead.getId())
                    .priority("HIGH")
                    .extraData(Map.of(
                            "leadId", lead.getId(),
                            "fullName", lead.getFullName(),
                            "phone", lead.getPhone(),
                            "courseId", lead.getCourseId() != null ? lead.getCourseId() : 0,
                            "url", "/admin/leads?leadId=" + lead.getId()
                    ));

            if (lead.getAssignedConsultantId() != null) {
                // Đã gán TVV cụ thể -> gửi cho ADMINs và chính TVV đó
                List<Account> admins = accountRepository.findByRoleCode("ADMIN");
                Set<Long> receivers = admins.stream()
                        .filter(a -> Boolean.TRUE.equals(a.getIsActive()) && a.getDeletedAt() == null)
                        .map(Account::getId)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
                receivers.add(lead.getAssignedConsultantId());
                notiBuilder.receiverAccountIds(new ArrayList<>(receivers));
            } else {
                // Nằm trong hàng đợi (Queue) -> Gửi cho toàn bộ ADMIN và LEAD (Tư vấn viên)
                notiBuilder.receiverRole("ADMIN_AND_CONSULTANT");

                // Phát sự kiện Fast-Claim tới WebSocket topic để tư vấn viên nhận ngay
                Map<String, Object> fastClaimPayload = Map.of(
                        "type", "FAST_CLAIM_NEW_LEAD",
                        "leadId", lead.getId(),
                        "fullName", lead.getFullName(),
                        "phone", lead.getPhone() != null ? lead.getPhone() : "",
                        "courseName", courseTitle,
                        "source", source,
                        "note", lead.getNote() != null ? lead.getNote() : "",
                        "timestamp", System.currentTimeMillis()
                );
                try {
                    messagingTemplate.convertAndSend("/topic/leads/fast-claim", fastClaimPayload);
                } catch (Exception ex) {
                    log.warn("[FastClaim] Lỗi broadcast FAST_CLAIM_NEW_LEAD: {}", ex.getMessage());
                }
            }

            notificationService.sendNotification(notiBuilder.build());
            log.info("[LeadNotification] Đã phát thông báo thành công cho Lead id={}", lead.getId());
        } catch (Exception e) {
            log.warn("[LeadNotification] Không thể gửi thông báo cho Lead id={}: {}", lead.getId(), e.getMessage());
        }
    }

    @Override
    @Transactional
    public LeadResponse claimLead(Long leadId, Long currentConsultantId) {
        Lead lead = findLeadById(leadId);

        if (lead.getAssignedConsultantId() != null) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Khách hàng này đã được một tư vấn viên khác tiếp nhận!");
        }

        Account consultant = accountRepository.findById(currentConsultantId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy tư vấn viên"));

        if ("RESIGNED".equalsIgnoreCase(consultant.getWorkStatus()) || Boolean.FALSE.equals(consultant.getIsActive())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tài khoản tư vấn viên không hợp lệ hoặc đã nghỉ việc");
        }

        lead.setAssignedConsultantId(currentConsultantId);
        if ("NEW".equals(lead.getStatus())) {
            lead.setStatus("IN_PROGRESS");
        }
        Lead saved = leadRepository.save(lead);

        // Chuyển ca trực của tư vấn viên thành BUSY
        consultant.setWorkStatus("BUSY");
        accountRepository.save(consultant);

        recordAssignmentLog(saved.getId(), null, currentConsultantId, "Tư vấn viên nhanh tay nhận khách (Fast-Claim)", currentConsultantId);

        // Xóa/ẩn thông báo của khách này ở các TVV khác để không còn hiển thị trong chuông thông báo
        try {
            int dismissed = notificationRecipientRepository.dismissLeadNotificationForOtherConsultants(saved.getId(), currentConsultantId);
            log.info("[FastClaim] Đã ẩn thông báo Lead id={} cho {} tài khoản tư vấn viên khác", saved.getId(), dismissed);
        } catch (Exception ex) {
            log.warn("[FastClaim] Lỗi dọn thông báo cho TVV khác: {}", ex.getMessage());
        }

        String consultantName = consultant.getUserProfile() != null && consultant.getUserProfile().getFullName() != null
                ? consultant.getUserProfile().getFullName() : consultant.getEmail();

        Map<String, Object> broadcastPayload = Map.of(
                "type", "LEAD_CLAIMED",
                "leadId", saved.getId(),
                "claimedById", currentConsultantId,
                "claimedBy", consultantName,
                "timestamp", System.currentTimeMillis()
        );
        try {
            messagingTemplate.convertAndSend("/topic/leads/fast-claim", broadcastPayload);
        } catch (Exception ex) {
            log.warn("[FastClaim] Lỗi broadcast LEAD_CLAIMED: {}", ex.getMessage());
        }

        log.info("[FastClaim] Tư vấn viên id={} ({}) đã nhận Lead id={}", currentConsultantId, consultantName, saved.getId());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public String getConsultantWorkStatus(Long currentConsultantId) {
        Account consultant = accountRepository.findById(currentConsultantId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        return consultant.getWorkStatus() != null ? consultant.getWorkStatus() : "AVAILABLE";
    }

    @Override
    @Transactional
    public void updateConsultantWorkStatus(Long currentConsultantId, String workStatus) {
        Account consultant = accountRepository.findById(currentConsultantId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        consultant.setWorkStatus(workStatus != null && !workStatus.isBlank() ? workStatus.trim().toUpperCase() : "AVAILABLE");
        accountRepository.save(consultant);
        log.info("[WorkStatus] Cập nhật ca trực consultantId={} -> {}", currentConsultantId, consultant.getWorkStatus());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsultantPerformanceResponse> getConsultantPerformance() {
        List<Account> consultants = accountRepository.findByRoleCode("LEAD");
        consultants.addAll(accountRepository.findByRoleCode("CONSULTANT"));

        Map<Long, Account> uniqueMap = consultants.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsActive()) && a.getDeletedAt() == null)
                .collect(Collectors.toMap(Account::getId, a -> a, (k1, k2) -> k1));

        List<Lead> allLeads = leadRepository.findAll();
        Map<Long, List<Lead>> leadsByConsultant = allLeads.stream()
                .filter(l -> l.getAssignedConsultantId() != null)
                .collect(Collectors.groupingBy(Lead::getAssignedConsultantId));

        return uniqueMap.values().stream().map(c -> {
            List<Lead> myLeads = leadsByConsultant.getOrDefault(c.getId(), Collections.emptyList());
            long total = myLeads.size();
            long newL = myLeads.stream().filter(l -> "NEW".equalsIgnoreCase(l.getStatus())).count();
            long inProg = myLeads.stream().filter(l -> "IN_PROGRESS".equalsIgnoreCase(l.getStatus())).count();
            long consulted = myLeads.stream().filter(l -> "CONSULTED".equalsIgnoreCase(l.getStatus())).count();
            long converted = myLeads.stream().filter(l -> "CONVERTED".equalsIgnoreCase(l.getStatus())).count();
            double rate = total > 0 ? ((double) converted / total) * 100 : 0.0;
            String tier = rate >= 30.0 ? "EXCELLENT" : (rate >= 15.0 ? "STANDARD" : "NEEDS_IMPROVEMENT");

            String name = c.getUserProfile() != null && c.getUserProfile().getFullName() != null
                    ? c.getUserProfile().getFullName() : c.getEmail();
            String phone = c.getUserProfile() != null ? c.getUserProfile().getPhone() : "";

            return ConsultantPerformanceResponse.builder()
                    .consultantId(c.getId())
                    .name(name)
                    .email(c.getEmail())
                    .phone(phone)
                    .workStatus(c.getWorkStatus() != null ? c.getWorkStatus() : "AVAILABLE")
                    .totalLeads(total)
                    .newLeads(newL)
                    .inProgressLeads(inProg)
                    .consultedLeads(consulted)
                    .convertedLeads(converted)
                    .conversionRate(Math.round(rate * 10.0) / 10.0)
                    .performanceTier(tier)
                    .build();
        }).sorted((a, b) -> Double.compare(b.getConversionRate(), a.getConversionRate())).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LeadStatisticsResponse getLeadStatistics(Long consultantId, LocalDateTime startDate, LocalDateTime endDate) {
        if ((SecurityUtils.hasRole("LEAD") || SecurityUtils.hasRole("CONSULTANT")) && !SecurityUtils.hasRole("ADMIN")) {
            consultantId = SecurityUtils.getCurrentAccountId();
        }

        List<Lead> allLeads = leadRepository.findAll();
        final Long targetConsultantId = consultantId;

        List<Lead> filtered = allLeads.stream()
                .filter(l -> targetConsultantId == null || (l.getAssignedConsultantId() != null && l.getAssignedConsultantId().equals(targetConsultantId)))
                .filter(l -> startDate == null || (l.getCreatedAt() != null && !l.getCreatedAt().isBefore(startDate)))
                .filter(l -> endDate == null || (l.getCreatedAt() != null && !l.getCreatedAt().isAfter(endDate)))
                .toList();

        long total = filtered.size();
        long newL = filtered.stream().filter(l -> "NEW".equalsIgnoreCase(l.getStatus())).count();
        long inProg = filtered.stream().filter(l -> "IN_PROGRESS".equalsIgnoreCase(l.getStatus())).count();
        long converted = filtered.stream().filter(l -> "CONVERTED".equalsIgnoreCase(l.getStatus()) || l.getStudentId() != null || l.getConvertedAt() != null).count();
        long consultedOnly = filtered.stream().filter(l -> "CONSULTED".equalsIgnoreCase(l.getStatus()) && l.getStudentId() == null && l.getConvertedAt() == null).count();
        double convRate = total > 0 ? Math.round(((double) converted / total) * 1000.0) / 10.0 : 0.0;

        Map<String, List<Lead>> groupedTime = filtered.stream()
                .filter(l -> l.getCreatedAt() != null)
                .sorted(Comparator.comparing(Lead::getCreatedAt))
                .collect(Collectors.groupingBy(
                        l -> "T" + l.getCreatedAt().getMonthValue() + "/" + l.getCreatedAt().getYear(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        long runLeads = 0;
        long runConv = 0;
        List<LeadStatisticsResponse.TimePoint> timeline = new ArrayList<>();
        for (Map.Entry<String, List<Lead>> entry : groupedTime.entrySet()) {
            long pLeads = entry.getValue().size();
            long pConv = entry.getValue().stream()
                    .filter(l -> "CONVERTED".equalsIgnoreCase(l.getStatus()) || l.getStudentId() != null || l.getConvertedAt() != null)
                    .count();
            runLeads += pLeads;
            runConv += pConv;
            timeline.add(LeadStatisticsResponse.TimePoint.builder()
                    .period(entry.getKey())
                    .totalLeads(pLeads)
                    .cumulativeLeads(runLeads)
                    .convertedLeads(pConv)
                    .cumulativeConverted(runConv)
                    .build());
        }

        List<LeadStatisticsResponse.DistributionPoint> distribution = List.of(
                LeadStatisticsResponse.DistributionPoint.builder()
                        .status("NEW").label("Khách mới").count(newL)
                        .percentage(total > 0 ? Math.round(((double) newL / total) * 1000.0) / 10.0 : 0.0)
                        .color("#1677ff").build(),
                LeadStatisticsResponse.DistributionPoint.builder()
                        .status("IN_PROGRESS").label("Đang tư vấn").count(inProg)
                        .percentage(total > 0 ? Math.round(((double) inProg / total) * 1000.0) / 10.0 : 0.0)
                        .color("#faad14").build(),
                LeadStatisticsResponse.DistributionPoint.builder()
                        .status("CONSULTED").label("Đã tư vấn").count(consultedOnly)
                        .percentage(total > 0 ? Math.round(((double) consultedOnly / total) * 1000.0) / 10.0 : 0.0)
                        .color("#722ed1").build(),
                LeadStatisticsResponse.DistributionPoint.builder()
                        .status("CONVERTED").label("Đã thành học viên").count(converted)
                        .percentage(total > 0 ? Math.round(((double) converted / total) * 1000.0) / 10.0 : 0.0)
                        .color("#52c41a").build()
        );

        List<ConsultantPerformanceResponse> consultantStats = new ArrayList<>();
        if (targetConsultantId == null || SecurityUtils.hasRole("ADMIN")) {
            List<Account> consultants = new ArrayList<>(accountRepository.findByRoleCode("LEAD"));
            consultants.addAll(accountRepository.findByRoleCode("CONSULTANT"));
            Map<Long, Account> uniqueMap = consultants.stream()
                    .filter(a -> Boolean.TRUE.equals(a.getIsActive()) && a.getDeletedAt() == null)
                    .collect(Collectors.toMap(Account::getId, a -> a, (k1, k2) -> k1));

            Map<Long, List<Lead>> leadsByC = allLeads.stream()
                    .filter(l -> l.getAssignedConsultantId() != null)
                    .filter(l -> startDate == null || (l.getCreatedAt() != null && !l.getCreatedAt().isBefore(startDate)))
                    .filter(l -> endDate == null || (l.getCreatedAt() != null && !l.getCreatedAt().isAfter(endDate)))
                    .collect(Collectors.groupingBy(Lead::getAssignedConsultantId));

            consultantStats = uniqueMap.values().stream().map(c -> {
                List<Lead> cLeads = leadsByC.getOrDefault(c.getId(), Collections.emptyList());
                long cTotal = cLeads.size();
                long cNew = cLeads.stream().filter(l -> "NEW".equalsIgnoreCase(l.getStatus())).count();
                long cInProg = cLeads.stream().filter(l -> "IN_PROGRESS".equalsIgnoreCase(l.getStatus())).count();
                long cConsulted = cLeads.stream().filter(l -> "CONSULTED".equalsIgnoreCase(l.getStatus())).count();
                long cConv = cLeads.stream().filter(l -> "CONVERTED".equalsIgnoreCase(l.getStatus()) || l.getStudentId() != null || l.getConvertedAt() != null).count();
                double cRate = cTotal > 0 ? Math.round(((double) cConv / cTotal) * 1000.0) / 10.0 : 0.0;
                String cTier = cRate >= 30.0 ? "EXCELLENT" : (cRate >= 15.0 ? "STANDARD" : "NEEDS_IMPROVEMENT");

                String name = c.getUserProfile() != null && c.getUserProfile().getFullName() != null
                        ? c.getUserProfile().getFullName() : c.getEmail();
                String phone = c.getUserProfile() != null ? c.getUserProfile().getPhone() : "";

                return ConsultantPerformanceResponse.builder()
                        .consultantId(c.getId())
                        .name(name)
                        .email(c.getEmail())
                        .phone(phone)
                        .workStatus(c.getWorkStatus() != null ? c.getWorkStatus() : "AVAILABLE")
                        .totalLeads(cTotal)
                        .newLeads(cNew)
                        .inProgressLeads(cInProg)
                        .consultedLeads(cConsulted)
                        .convertedLeads(cConv)
                        .conversionRate(cRate)
                        .performanceTier(cTier)
                        .build();
            }).sorted((a, b) -> Double.compare(b.getConversionRate(), a.getConversionRate())).toList();
        }

        return LeadStatisticsResponse.builder()
                .totalLeads(total)
                .newLeads(newL)
                .inProgressLeads(inProg)
                .consultedLeads(consultedOnly)
                .convertedLeads(converted)
                .conversionRate(convRate)
                .timeline(timeline)
                .distribution(distribution)
                .consultants(consultantStats)
                .build();
    }

    private String emptyToNull(String str) {
        return (str == null || str.trim().isEmpty()) ? null : str.trim();
    }
}
