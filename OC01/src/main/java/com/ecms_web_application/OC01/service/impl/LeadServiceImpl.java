package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.LeadAssignRequest;
import com.ecms_web_application.OC01.dto.request.LeadCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadInteractionCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadPlacementTestCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadUpdateRequest;
import com.ecms_web_application.OC01.dto.response.LeadDetailResponse;
import com.ecms_web_application.OC01.dto.response.LeadInteractionResponse;
import com.ecms_web_application.OC01.dto.response.LeadPlacementTestResponse;
import com.ecms_web_application.OC01.dto.response.LeadResponse;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.LeadAssignmentLog;
import com.ecms_web_application.OC01.entity.LeadInteraction;
import com.ecms_web_application.OC01.entity.LeadPlacementTest;
import com.ecms_web_application.OC01.entity.LeadStatusLog;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.LeadAssignmentLogRepository;
import com.ecms_web_application.OC01.repository.LeadInteractionRepository;
import com.ecms_web_application.OC01.repository.LeadPlacementTestRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.LeadStatusLogRepository;
import com.ecms_web_application.OC01.service.LeadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadServiceImpl implements LeadService {

    private final LeadRepository leadRepository;
    private final LeadInteractionRepository interactionRepository;
    private final LeadPlacementTestRepository placementTestRepository;
    private final LeadStatusLogRepository statusLogRepository;
    private final LeadAssignmentLogRepository assignmentLogRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<LeadResponse> search(String search, String status, Long courseId, Long sourceId, Long consultantId, Boolean inQueue, Pageable pageable) {
        return leadRepository
                .searchLeads(emptyToNull(status), courseId, sourceId, consultantId, inQueue, emptyToNull(search), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public LeadResponse getById(Long id) {
        Lead lead = findLeadById(id);
        return toResponse(lead);
    }

    @Override
    @Transactional(readOnly = true)
    public LeadDetailResponse getDetailById(Long id) {
        Lead lead = findLeadById(id);
        LeadDetailResponse detail = new LeadDetailResponse();
        copyPropertiesToResponse(lead, detail);

        List<LeadInteractionResponse> interactions = interactionRepository.findByLeadIdOrderByCreatedAtDesc(id)
                .stream().map(this::toInteractionResponse).toList();
        List<LeadPlacementTestResponse> placementTests = placementTestRepository.findByLeadIdOrderByCreatedAtDesc(id)
                .stream().map(this::toPlacementTestResponse).toList();
        List<LeadStatusLog> statusLogs = statusLogRepository.findByLeadIdOrderByChangedAtDesc(id);
        List<LeadAssignmentLog> assignmentLogs = assignmentLogRepository.findByLeadIdOrderByChangedAtDesc(id);

        detail.setInteractions(interactions);
        detail.setPlacementTests(placementTests);
        detail.setStatusLogs(statusLogs);
        detail.setAssignmentLogs(assignmentLogs);
        return detail;
    }

    @Override
    @Transactional
    public LeadResponse create(LeadCreateRequest request) {
        Lead lead = new Lead();
        lead.setFullName(request.getFullName().trim());
        lead.setEmail(request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null);
        lead.setPhone(emptyToNull(request.getPhone()));
        lead.setCourseId(request.getCourseId());
        lead.setSourceId(request.getSourceId());
        lead.setAssignedConsultantId(request.getAssignedConsultantId());
        lead.setNote(emptyToNull(request.getNote()));

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().trim().toUpperCase()
                : "NEW";
        lead.setStatus(status);

        Lead saved = leadRepository.save(lead);
        Long currentUserId = SecurityUtils.getCurrentAccountId();

        // Ghi log trạng thái ban đầu
        recordStatusLog(saved.getId(), null, saved.getStatus(), "Khởi tạo Lead mới", currentUserId);

        // Ghi log phân công nếu đã chọn người phụ trách ban đầu
        if (saved.getAssignedConsultantId() != null) {
            recordAssignmentLog(saved.getId(), null, saved.getAssignedConsultantId(), "Phân công tư vấn viên ban đầu", currentUserId);
        }

        log.info("Tạo mới Lead id={}, fullName={}, status={}", saved.getId(), saved.getFullName(), saved.getStatus());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public LeadResponse update(Long id, LeadUpdateRequest request) {
        Lead lead = findLeadById(id);
        Long currentUserId = SecurityUtils.getCurrentAccountId();

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            lead.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null) {
            lead.setEmail(emptyToNull(request.getEmail().toLowerCase()));
        }
        if (request.getPhone() != null) {
            lead.setPhone(emptyToNull(request.getPhone()));
        }
        if (request.getCourseId() != null) {
            lead.setCourseId(request.getCourseId());
        }
        if (request.getSourceId() != null) {
            lead.setSourceId(request.getSourceId());
        }
        if (request.getStudentId() != null) {
            lead.setStudentId(request.getStudentId());
        }
        if (request.getNote() != null) {
            lead.setNote(emptyToNull(request.getNote()));
        }

        // Xử lý thay đổi phân công
        if (request.getAssignedConsultantId() != null && !Objects.equals(request.getAssignedConsultantId(), lead.getAssignedConsultantId())) {
            Long oldConsultantId = lead.getAssignedConsultantId();
            lead.setAssignedConsultantId(request.getAssignedConsultantId());
            recordAssignmentLog(lead.getId(), oldConsultantId, request.getAssignedConsultantId(), "Cập nhật người phụ trách", currentUserId);
        }

        // Xử lý thay đổi trạng thái (Bất biến: KHÔNG lùi từ CONSULTED về NEW)
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            String newStatus = request.getStatus().trim().toUpperCase();
            String oldStatus = lead.getStatus();
            if ("CONSULTED".equalsIgnoreCase(oldStatus) && "NEW".equalsIgnoreCase(newStatus)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quy tắc nghiệp vụ: Không được phép chuyển lùi trạng thái Lead từ CONSULTED về NEW");
            }
            if (!newStatus.equalsIgnoreCase(oldStatus)) {
                lead.setStatus(newStatus);
                recordStatusLog(lead.getId(), oldStatus, newStatus, "Cập nhật trạng thái qua API", currentUserId);
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
        // Ràng buộc: reject_reason bắt buộc khi result = REJECTED (hoặc TỪ CHỐI)
        if ("REJECTED".equalsIgnoreCase(result) || "TỪ CHỐI".equalsIgnoreCase(result)) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quy tắc nghiệp vụ: Bắt buộc cung cấp lý do từ chối (rejectReason) khi kết quả tư vấn là Từ chối");
            }
        }

        Long currentUserId = SecurityUtils.getCurrentAccountId();

        LeadInteraction interaction = new LeadInteraction();
        interaction.setLeadId(id);
        interaction.setInteractionType(request.getInteractionType().trim().toUpperCase());
        interaction.setNotes(emptyToNull(request.getNotes()));
        interaction.setResult(result);
        interaction.setRejectReason(emptyToNull(request.getRejectReason()));
        interaction.setPerformedBy(currentUserId);
        LeadInteraction savedInteraction = interactionRepository.save(interaction);

        // Bất biến & Tác dụng phụ: Nếu Lead đang ở trạng thái NEW -> tự động chuyển sang CONSULTED
        if ("NEW".equalsIgnoreCase(lead.getStatus())) {
            lead.setStatus("CONSULTED");
            leadRepository.save(lead);
            recordStatusLog(lead.getId(), "NEW", "CONSULTED", "Tự động chuyển CONSULTED khi ghi nhận tương tác tư vấn đầu tiên", currentUserId);
            log.info("Tự động chuyển trạng thái Lead id={} từ NEW sang CONSULTED", id);
        }

        return toInteractionResponse(savedInteraction);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeadInteractionResponse> getInteractions(Long id) {
        findLeadById(id);
        return interactionRepository.findByLeadIdOrderByCreatedAtDesc(id)
                .stream().map(this::toInteractionResponse).toList();
    }

    @Override
    @Transactional
    public LeadPlacementTestResponse recordPlacementTest(Long id, LeadPlacementTestCreateRequest request) {
        findLeadById(id);
        String testStatus = request.getTestStatus().trim().toUpperCase();

        // Ràng buộc: test_score chỉ có khi test_status = COMPLETED
        if (!"COMPLETED".equalsIgnoreCase(testStatus) && request.getTestScore() != null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quy tắc nghiệp vụ: Điểm đánh giá (testScore) chỉ được phép ghi nhận khi trạng thái bài test là COMPLETED");
        }

        LeadPlacementTest test = new LeadPlacementTest();
        test.setLeadId(id);
        test.setTestStatus(testStatus);
        test.setScheduledAt(request.getScheduledAt());
        test.setTestScore(request.getTestScore());
        test.setRecommendedLevel(emptyToNull(request.getRecommendedLevel()));
        test.setNotes(emptyToNull(request.getNotes()));
        test.setEvaluatedAt(request.getEvaluatedAt() != null ? request.getEvaluatedAt() : ("COMPLETED".equalsIgnoreCase(testStatus) ? LocalDateTime.now() : null));

        LeadPlacementTest saved = placementTestRepository.save(test);
        log.info("Ghi nhận đánh giá đầu vào cho Lead id={}, status={}", id, saved.getTestStatus());
        return toPlacementTestResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeadPlacementTestResponse> getPlacementTests(Long id) {
        findLeadById(id);
        return placementTestRepository.findByLeadIdOrderByCreatedAtDesc(id)
                .stream().map(this::toPlacementTestResponse).toList();
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Lead lead = findLeadById(id);
        // Chuyển trạng thái kết thúc tư vấn / ghi log
        recordStatusLog(lead.getId(), lead.getStatus(), "CONSULTED", "Đóng tư vấn Lead", SecurityUtils.getCurrentAccountId());
        lead.setStatus("CONSULTED");
        leadRepository.save(lead);
        log.info("Đã cập nhật đóng tư vấn Lead id={}", id);
    }

    // ===== Private Helper Methods =====

    private Lead findLeadById(Long id) {
        return leadRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy Lead với ID: " + id));
    }

    private void recordStatusLog(Long leadId, String oldStatus, String newStatus, String reason, Long changedBy) {
        LeadStatusLog logEntity = new LeadStatusLog();
        logEntity.setLeadId(leadId);
        logEntity.setOldStatus(oldStatus);
        logEntity.setNewStatus(newStatus);
        logEntity.setReason(reason);
        logEntity.setChangedBy(changedBy);
        statusLogRepository.save(logEntity);
    }

    private void recordAssignmentLog(Long leadId, Long oldConsultantId, Long newConsultantId, String reason, Long changedBy) {
        LeadAssignmentLog logEntity = new LeadAssignmentLog();
        logEntity.setLeadId(leadId);
        logEntity.setOldConsultantId(oldConsultantId);
        logEntity.setNewConsultantId(newConsultantId);
        logEntity.setReason(reason);
        logEntity.setChangedBy(changedBy);
        assignmentLogRepository.save(logEntity);
    }

    private void copyPropertiesToResponse(Lead lead, LeadResponse response) {
        response.setId(lead.getId());
        response.setFullName(lead.getFullName());
        response.setEmail(lead.getEmail());
        response.setPhone(lead.getPhone());
        response.setCourseId(lead.getCourseId());
        response.setStudentId(lead.getStudentId());
        response.setStatus(lead.getStatus());
        response.setConvertedAt(lead.getConvertedAt());
        response.setSourceId(lead.getSourceId());
        response.setAssignedConsultantId(lead.getAssignedConsultantId());
        response.setNote(lead.getNote());
        response.setCreatedAt(lead.getCreatedAt());
        response.setUpdatedAt(lead.getUpdatedAt());
    }

    private LeadResponse toResponse(Lead lead) {
        LeadResponse response = new LeadResponse();
        copyPropertiesToResponse(lead, response);
        return response;
    }

    private LeadInteractionResponse toInteractionResponse(LeadInteraction interaction) {
        LeadInteractionResponse response = new LeadInteractionResponse();
        response.setId(interaction.getId());
        response.setLeadId(interaction.getLeadId());
        response.setInteractionType(interaction.getInteractionType());
        response.setNotes(interaction.getNotes());
        response.setResult(interaction.getResult());
        response.setRejectReason(interaction.getRejectReason());
        response.setPerformedBy(interaction.getPerformedBy());
        response.setCreatedAt(interaction.getCreatedAt());
        return response;
    }

    private LeadPlacementTestResponse toPlacementTestResponse(LeadPlacementTest test) {
        LeadPlacementTestResponse response = new LeadPlacementTestResponse();
        response.setId(test.getId());
        response.setLeadId(test.getLeadId());
        response.setTestStatus(test.getTestStatus());
        response.setScheduledAt(test.getScheduledAt());
        response.setTestScore(test.getTestScore());
        response.setRecommendedLevel(test.getRecommendedLevel());
        response.setNotes(test.getNotes());
        response.setEvaluatedAt(test.getEvaluatedAt());
        response.setCreatedAt(test.getCreatedAt());
        return response;
    }

    private String emptyToNull(String str) {
        return (str == null || str.trim().isEmpty()) ? null : str.trim();
    }
}
