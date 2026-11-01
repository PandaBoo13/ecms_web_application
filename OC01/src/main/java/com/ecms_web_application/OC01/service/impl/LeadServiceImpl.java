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
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.LeadAssignmentLogRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.service.LeadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadServiceImpl implements LeadService {

    private final LeadRepository leadRepository;
    private final LeadAssignmentLogRepository assignmentLogRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<LeadResponse> search(String search, String status, Long courseId, Long sourceId, Long consultantId, Boolean inQueue, Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("createdAt").descending());
        }
        return leadRepository
                .searchLeads(emptyToNull(status), courseId, consultantId, inQueue, emptyToNull(search), pageable)
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
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quy tắc nghiệp vụ: Bắt buộc cung cấp lý do từ chối (rejectReason) khi kết quả tư vấn là Từ chối");
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
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
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
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Điểm đánh giá (testScore) là bắt buộc khi trạng thái là COMPLETED");
            }
            lead.setPlacementTestStatus("COMPLETED");
            lead.setPlacementTestScore(request.getTestScore());
            lead.setPlacementRecommendedLevel(emptyToNull(request.getRecommendedLevel()));
            lead.setPlacementTestNotes(emptyToNull(request.getNotes()));
            lead.setPlacementEvaluatedAt(request.getEvaluatedAt() != null ? request.getEvaluatedAt() : LocalDateTime.now());
        } else if ("REFUSED".equals(testStatus) || "NO_SHOW".equals(testStatus)) {
            lead.setPlacementTestStatus(testStatus);
            lead.setPlacementTestScore(null);
            String notes = emptyToNull(request.getNotes());
            if (notes == null) {
                notes = "REFUSED".equals(testStatus) ? "Khách hàng từ chối làm bài kiểm tra" : "Khách hàng vắng mặt";
            }
            lead.setPlacementTestNotes(notes);
            lead.setPlacementRecommendedLevel(null);
            lead.setPlacementEvaluatedAt(request.getEvaluatedAt() != null ? request.getEvaluatedAt() : LocalDateTime.now());
        } else {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Trạng thái đánh giá đầu vào chỉ chấp nhận: COMPLETED, REFUSED, NO_SHOW");
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

    private void recordAssignmentLog(Long leadId, Long oldConsultantId, Long newConsultantId, String reason, Long changedBy) {
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

    private void copyPropertiesToResponse(Lead lead, LeadResponse response) {
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
        response.setCreatedAt(lead.getPlacementTestCreatedAt() != null ? lead.getPlacementTestCreatedAt() : lead.getCreatedAt());
        return response;
    }

    private String emptyToNull(String str) {
        return (str == null || str.trim().isEmpty()) ? null : str.trim();
    }
}
