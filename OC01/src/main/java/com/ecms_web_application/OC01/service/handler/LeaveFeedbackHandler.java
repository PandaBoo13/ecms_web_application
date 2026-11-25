package com.ecms_web_application.OC01.service.handler;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.entity.AttendanceRecord;
import com.ecms_web_application.OC01.entity.AuditLog;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.entity.enums.AttendanceStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.RequestStatus;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.enums.SessionStatus;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AttendanceRecordRepository;
import com.ecms_web_application.OC01.repository.AuditLogRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.RequestRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Handler cho đơn xin nghỉ phép của học viên (LEAVE_FEEDBACK).
 *
 * <ul>
 *   <li>Target: SESSION (targetEntityId = sessionId)</li>
 *   <li>Payload phải chứa enrollmentId thuộc đúng khóa của buổi học</li>
 *   <li>Duyệt → attendance.status = EXCUSED (vắng có phép)</li>
 *   <li>Từ chối → attendance.status = ABSENT (vắng) — chỉ khi buổi đã diễn ra</li>
 *   <li>Không ghi đè PRESENT; bỏ qua buổi đã hủy; không đánh ABSENT trước khi buổi diễn ra</li>
 *   <li>Chặn áp/thu hồi đơn nghỉ khi bảng điểm của khóa đã được duyệt và công bố</li>
 *   <li>Thu hồi đơn đã duyệt → hoàn tác điểm danh từ snapshot lưu trong responseData</li>
 *   <li>Mọi thay đổi đều ghi AuditLog để tra vết tại buổi điểm danh</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeaveFeedbackHandler implements RequestHandler {

    private static final String AUDIT_ENTITY = "SESSION_ATTENDANCE";
    private static final String META_PREVIOUS_STATUS = "attendancePreviousStatus";
    private static final String META_PREVIOUS_NOTE = "attendancePreviousNote";
    private static final String META_RECORD_CREATED = "attendanceRecordCreated";

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AuditLogRepository auditLogRepository;
    private final SessionRepository sessionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final RequestRepository requestRepository;

    @Override
    public RequestType supportedType() {
        return RequestType.LEAVE_FEEDBACK;
    }

    // ─── validate khi tạo đơn ───────────────────────────────────────────

    @Override
    public void validateCreate(RequestCreateRequest req, RequestType type) {
        Long sessionId = req.getTargetEntityId();
        if (sessionId == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Đơn xin nghỉ phải gắn với một buổi học");
        }
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Buổi học không tồn tại"));
        if (session.getStatus() == SessionStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Buổi học đã bị hủy — không thể tạo đơn xin nghỉ");
        }
        if (session.getEndTime() != null && !session.getEndTime().isAfter(LocalDateTime.now())) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Buổi học đã kết thúc — không thể tạo đơn xin nghỉ");
        }
        if (session.getCourse() == null
                || session.getCourse().getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Đơn xin nghỉ buổi học chỉ áp dụng cho khóa OFFLINE");
        }

        Long enrollmentId = extractEnrollmentId(req.getPayload());
        if (enrollmentId == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Đơn xin nghỉ phải kèm enrollmentId");
        }
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Ghi danh không tồn tại"));
        requireEnrollmentBelongsToSession(enrollment, session);
        if (enrollment.getStatus() == EnrollmentStatus.TERMINATED) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Ghi danh đã kết thúc — không thể xin nghỉ");
        }

        if (SecurityUtils.hasRole("STUDENT")) {
            Student student = studentRepository
                    .findByUserId(SecurityUtils.requireCurrentAccountId()).orElse(null);
            if (student == null || !student.getId().equals(enrollment.getStudentId())) {
                throw new ErrorHandler(HttpStatus.FORBIDDEN,
                        "Bạn chỉ có thể tạo đơn xin nghỉ cho chính mình");
            }
        }
    }

    // ─── side-effect khi duyệt / từ chối ────────────────────────────────

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
                "Đã từ chối đơn nghỉ phép");
    }

    // ─── thu hồi đơn đã duyệt ───────────────────────────────────────────

    @Override
    public void onCancel(Request request) {
        if (request.getStatus() != RequestStatus.APPROVED) {
            return; // đơn PENDING chưa đụng điểm danh
        }
        Map<String, Object> meta = request.getResponseData();
        if (meta == null || meta.get(META_PREVIOUS_STATUS) == null) {
            log.warn("[LeaveFeedbackHandler] Đơn #{} không có snapshot điểm danh — không thể hoàn tác tự động",
                    request.getId());
            return;
        }

        Long sessionId = request.getTargetEntityId();
        Long enrollmentId = extractEnrollmentId(request);
        if (sessionId == null || enrollmentId == null) return;

        Session session = sessionRepository.findByIdForUpdate(sessionId).orElse(null);
        if (session == null || session.getStatus() == SessionStatus.CANCELLED) return;

        ensureGradeSheetNotPublished(session);

        AttendanceRecord record = attendanceRecordRepository
                .findByEnrollmentIdAndSessionIdForUpdate(enrollmentId, sessionId)
                .orElse(null);
        if (record == null) return;

        Long actorId = SecurityUtils.requireCurrentAccountId();
        String oldStatus = record.getStatus() != null
                ? record.getStatus().name() : AttendanceStatus.NOT_MARKED.name();
        String oldNote = record.getNote();

        if (Boolean.TRUE.equals(meta.get(META_RECORD_CREATED))) {
            attendanceRecordRepository.delete(record);
            auditLogRepository.save(auditLog(sessionId, enrollmentId, actorId, "DELETE",
                    oldStatus, oldNote, null, null));
            log.info("[LeaveFeedbackHandler] Thu hồi đơn #{} — xóa điểm danh do đơn tạo (session={}, enrollment={})",
                    request.getId(), sessionId, enrollmentId);
            return;
        }

        AttendanceStatus previous = parseStatus(meta.get(META_PREVIOUS_STATUS));
        String previousNote = meta.get(META_PREVIOUS_NOTE) == null
                ? null : meta.get(META_PREVIOUS_NOTE).toString();
        record.setStatus(previous);
        record.setNote(previousNote);
        record.setUpdatedAt(LocalDateTime.now());
        record.setUpdatedBy(actorId);
        record.setMarkedAt(LocalDateTime.now());
        record.setMarkedBy(actorId);
        attendanceRecordRepository.save(record);
        auditLogRepository.save(auditLog(sessionId, enrollmentId, actorId, "UPDATE",
                oldStatus, oldNote, previous.name(), previousNote));
        log.info("[LeaveFeedbackHandler] Thu hồi đơn #{} — khôi phục điểm danh {} → {} (session={}, enrollment={})",
                request.getId(), oldStatus, previous, sessionId, enrollmentId);
    }

    // ─── private helpers ────────────────────────────────────────────────

    /**
     * Áp trạng thái điểm danh theo quyết định duyệt/từ chối.
     * Dùng chung cho luồng mới (duyệt ngay tại ô điểm danh) và luồng cũ
     * (duyệt trong chi tiết buổi học).
     */
    private void applyDecision(Request request, AttendanceStatus target, String note, String logMessage) {
        Long sessionId = request.getTargetEntityId();
        Long enrollmentId = extractEnrollmentId(request);
        if (sessionId == null || enrollmentId == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Đơn xin nghỉ thiếu sessionId hoặc enrollmentId");
        }

        Session session = sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Buổi học của đơn xin nghỉ không tồn tại"));
        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Ghi danh của đơn xin nghỉ không tồn tại"));
        requireEnrollmentBelongsToSession(enrollment, session);

        if (session.getStatus() == SessionStatus.CANCELLED) {
            log.warn("[LeaveFeedbackHandler] Buổi {} đã hủy — bỏ qua cập nhật điểm danh cho đơn #{}",
                    sessionId, request.getId());
            markSkipped(request, "Buổi học đã bị hủy nên không áp dụng điểm danh");
            return;
        }

        ensureGradeSheetNotPublished(session);

        LocalDateTime now = LocalDateTime.now();
        boolean conducted = session.getEndTime() != null && !session.getEndTime().isAfter(now);

        // Từ chối đơn của buổi CHƯA diễn ra → không đánh vắng trước (HV vẫn có thể đi học)
        if (target == AttendanceStatus.ABSENT && !conducted) {
            log.info("[LeaveFeedbackHandler] Đơn #{} bị từ chối khi buổi {} chưa diễn ra — giữ nguyên điểm danh",
                    request.getId(), sessionId);
            markSkipped(request, "Buổi học chưa diễn ra nên không đánh vắng trước");
            return;
        }

        Long actorId = SecurityUtils.requireCurrentAccountId();
        Optional<AttendanceRecord> existing = attendanceRecordRepository
                .findByEnrollmentIdAndSessionIdForUpdate(enrollmentId, sessionId);
        boolean isNew = existing.isEmpty();
        AttendanceRecord record = existing.orElseGet(() -> {
            AttendanceRecord created = new AttendanceRecord();
            created.setEnrollmentId(enrollmentId);
            created.setSessionId(sessionId);
            created.setCreatedBy(actorId);
            return created;
        });

        AttendanceStatus current = record.getStatus() == null
                ? AttendanceStatus.NOT_MARKED : record.getStatus();
        if (current == AttendanceStatus.PRESENT) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Học viên đã được điểm danh CÓ MẶT ở buổi này — "
                            + "vui lòng sửa điểm danh trước khi xử lý đơn nghỉ");
        }
        if (current == target) {
            // Không đổi điểm danh nhưng vẫn lưu snapshot để thu hồi đơn về sau
            storeSnapshot(request, current, record.getNote(), false);
            log.info("[LeaveFeedbackHandler] Đơn #{}: điểm danh đã ở trạng thái {} — không cần đổi",
                    request.getId(), target);
            return;
        }

        String oldNote = record.getNote();
        String finalNote = note == null || note.isBlank() ? null : note.trim();
        record.setStatus(target);
        if (finalNote != null && (oldNote == null || oldNote.isBlank() || target == AttendanceStatus.ABSENT)) {
            record.setNote(finalNote);
        }
        record.setUpdatedAt(now);
        record.setUpdatedBy(actorId);
        record.setMarkedAt(now);
        record.setMarkedBy(actorId);
        AttendanceRecord saved = attendanceRecordRepository.save(record);

        auditLogRepository.save(auditLog(sessionId, enrollmentId, actorId,
                isNew ? "CREATE" : "UPDATE",
                current.name(), oldNote, target.name(), saved.getNote()));

        storeSnapshot(request, current, oldNote, isNew);

        log.info("[LeaveFeedbackHandler] {} request#{}, enrollmentId={}, sessionId={} → {}",
                logMessage, request.getId(), enrollmentId, sessionId, target);
    }

    /** Bảng điểm đã duyệt/công bố thì điểm danh bị khóa — không được áp hay thu hồi đơn nghỉ. */
    private void ensureGradeSheetNotPublished(Session session) {
        if (session.getCourse() == null) return;
        boolean published = requestRepository.findLatestByTargetAndType(
                        "COURSE", session.getCourse().getId(), RequestType.COURSE_GRADE_APPROVAL)
                .map(r -> r.getStatus() == RequestStatus.APPROVED)
                .orElse(false);
        if (published) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Bảng điểm của khóa đã được duyệt và công bố nên không thể áp hoặc thu hồi đơn nghỉ. "
                            + publishedContactLine());
        }
    }

    /** Học viên nhận hướng dẫn liên hệ giảng viên; nhân viên giữ đầu mối học vụ. */
    private String publishedContactLine() {
        return SecurityUtils.hasRole("STUDENT")
                ? "Vui lòng liên hệ giảng viên phụ trách nếu cần hỗ trợ."
                : "Vui lòng liên hệ quản trị viên nếu cần điều chỉnh điểm danh.";
    }

    private void requireEnrollmentBelongsToSession(Enrollment enrollment, Session session) {
        if (session.getCourse() == null
                || !Objects.equals(enrollment.getCourseId(), session.getCourse().getId())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Ghi danh không thuộc khóa học của buổi học này");
        }
    }

    private void storeSnapshot(Request request, AttendanceStatus previousStatus,
            String previousNote, boolean recordCreated) {
        Map<String, Object> meta = request.getResponseData() == null
                ? new HashMap<>() : new HashMap<>(request.getResponseData());
        meta.put(META_PREVIOUS_STATUS, previousStatus.name());
        meta.put(META_PREVIOUS_NOTE, previousNote);
        meta.put(META_RECORD_CREATED, recordCreated);
        request.setResponseData(meta);
    }

    private void markSkipped(Request request, String reason) {
        Map<String, Object> meta = request.getResponseData() == null
                ? new HashMap<>() : new HashMap<>(request.getResponseData());
        meta.put("attendanceSkipped", true);
        meta.put("attendanceSkipReason", reason);
        request.setResponseData(meta);
    }

    private AttendanceStatus parseStatus(Object value) {
        if (value == null) return AttendanceStatus.NOT_MARKED;
        try {
            return AttendanceStatus.valueOf(value.toString().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return AttendanceStatus.NOT_MARKED;
        }
    }

    private AuditLog auditLog(Long sessionId, Long enrollmentId, Long actorId, String action,
            String oldStatus, String oldNote, String newStatus, String newNote) {
        AuditLog logEntry = new AuditLog();
        logEntry.setActorId(actorId);
        logEntry.setAction(action);
        logEntry.setEntityType(AUDIT_ENTITY);
        logEntry.setEntityId(sessionId);
        logEntry.setOldValue(snapshot(enrollmentId, oldStatus, oldNote));
        logEntry.setNewValue(newStatus == null ? null : snapshot(enrollmentId, newStatus, newNote));
        return logEntry;
    }

    private Map<String, Object> snapshot(Long enrollmentId, String status, String note) {
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("enrollmentId", enrollmentId);
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
        return extractEnrollmentId(request.getPayload());
    }

    private Long extractEnrollmentId(Map<String, Object> payload) {
        if (payload == null) return null;
        Object val = payload.get("enrollmentId");
        if (val == null) return null;
        if (val instanceof Number num) return num.longValue();
        try { return Long.parseLong(val.toString().trim()); }
        catch (NumberFormatException e) { return null; }
    }
}
