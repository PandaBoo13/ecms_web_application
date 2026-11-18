package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.entity.AttendanceRecord;
import com.ecms_web_application.OC01.entity.AuditLog;
import com.ecms_web_application.OC01.entity.enums.AttendanceStatus;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.repository.AttendanceRecordRepository;
import com.ecms_web_application.OC01.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Handler cho đơn xin nghỉ phép của học viên (LEAVE_FEEDBACK).
 *
 * <ul>
 *   <li>Target: SESSION (targetEntityId = sessionId)</li>
 *   <li>Payload phải chứa enrollmentId</li>
 *   <li>Duyệt → attendance.status = EXCUSED (vắng có phép)</li>
 *   <li>Từ chối → attendance.status = ABSENT (vắng)</li>
 *   <li>Nếu chưa có AttendanceRecord → tạo mới rồi áp trạng thái tương ứng</li>
 *   <li>Mọi thay đổi đều ghi AuditLog để tra vết tại buổi điểm danh</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeaveFeedbackHandler implements RequestHandler {

    private static final String AUDIT_ENTITY = "SESSION_ATTENDANCE";

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AuditLogRepository auditLogRepository;

    @Override
    public RequestType supportedType() {
        return RequestType.LEAVE_FEEDBACK;
    }

    @Override
    public void onApprove(Request request, RequestReviewRequest review) {
        String reason = leaveReason(request);
        applyDecision(request, AttendanceStatus.EXCUSED, reason, "Đã duyệt đơn nghỉ phép");
    }

    @Override
    public void onReject(Request request, RequestReviewRequest review) {
        String note = review != null && review.getNote() != null && !review.getNote().isBlank()
                ? review.getNote().trim()
                : "Không có lý do";
        applyDecision(request, AttendanceStatus.ABSENT, "Từ chối đơn nghỉ: " + note,
                "Đã từ chối đơn nghỉ phép → ABSENT");
    }

    // ─── private helpers ────────────────────────────────────────────────

    /**
     * Áp trạng thái điểm danh theo quyết định duyệt/từ chối.
     * Dùng chung cho luồng mới (duyệt ngay tại ô điểm danh) và luồng cũ
     * (duyệt trong chi tiết buổi học).
     */
    private void applyDecision(Request request, AttendanceStatus status, String note, String logMessage) {
        Long sessionId = request.getTargetEntityId();
        Long enrollmentId = extractEnrollmentId(request);
        if (sessionId == null || enrollmentId == null) {
            log.warn("[LeaveFeedbackHandler] Thiếu sessionId hoặc enrollmentId trong request #{}", request.getId());
            return;
        }

        Long actorId = SecurityUtils.requireCurrentAccountId();
        Optional<AttendanceRecord> opt = attendanceRecordRepository
                .findByEnrollmentIdAndSessionId(enrollmentId, sessionId);
        AttendanceRecord record = opt.orElseGet(() -> {
            AttendanceRecord created = new AttendanceRecord();
            created.setEnrollmentId(enrollmentId);
            created.setSessionId(sessionId);
            created.setCreatedBy(actorId);
            return created;
        });

        boolean isNew = record.getId() == null;
        String oldStatus = isNew || record.getStatus() == null
                ? AttendanceStatus.NOT_MARKED.name()
                : record.getStatus().name();
        String oldNote = record.getNote();

        String finalNote = note == null || note.isBlank() ? null : note.trim();
        record.setStatus(status);
        if (finalNote != null && (oldNote == null || oldNote.isBlank() || status == AttendanceStatus.ABSENT)) {
            record.setNote(finalNote);
        }
        record.setUpdatedAt(LocalDateTime.now());
        record.setUpdatedBy(actorId);
        record.setMarkedAt(LocalDateTime.now());
        record.setMarkedBy(actorId);
        attendanceRecordRepository.save(record);

        auditLogRepository.save(auditLog(sessionId, actorId, oldStatus, oldNote,
                status.name(), record.getNote(), isNew));

        log.info("[LeaveFeedbackHandler] {} request#{}, enrollmentId={}, sessionId={} → {}",
                logMessage, request.getId(), enrollmentId, sessionId, status);
    }

    private AuditLog auditLog(Long sessionId, Long actorId,
            String oldStatus, String oldNote,
            String newStatus, String newNote, boolean isNew) {
        AuditLog logEntry = new AuditLog();
        logEntry.setActorId(actorId);
        logEntry.setAction(isNew ? "CREATE" : "UPDATE");
        logEntry.setEntityType(AUDIT_ENTITY);
        logEntry.setEntityId(sessionId);
        logEntry.setOldValue(snapshot(oldStatus, oldNote));
        logEntry.setNewValue(snapshot(newStatus, newNote));
        return logEntry;
    }

    private Map<String, Object> snapshot(String status, String note) {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("status", status);
        snapshot.put("note", note);
        return snapshot;
    }

    private String leaveReason(Request request) {
        if (request.getDescription() != null && !request.getDescription().isBlank()) {
            return request.getDescription();
        }
        if (request.getPayload() != null) {
            Object reason = request.getPayload().get("reason");
            if (reason != null) return reason.toString();
        }
        return null;
    }

    private Long extractEnrollmentId(Request request) {
        if (request.getPayload() == null) return null;
        Object val = request.getPayload().get("enrollmentId");
        if (val == null) return null;
        if (val instanceof Number num) return num.longValue();
        try { return Long.parseLong(val.toString()); }
        catch (NumberFormatException e) { return null; }
    }
}
