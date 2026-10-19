package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.SessionResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Course;
import com.ecms_web_application.OC01.entity.Room;
import com.ecms_web_application.OC01.entity.Session;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.SessionStatus;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.validator.SessionValidator;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.RoomRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
import com.ecms_web_application.OC01.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final CourseRepository courseRepository;
    private final AccountRepository accountRepository;
    private final RoomRepository roomRepository;
    private final AuditLogService auditLogService;
    private final ProgressCalculationService progressCalculationService;
    private final SessionValidator sessionValidator;

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> listByCourse(Long courseId) {
        return sessionRepository.findByCourse_IdOrderBySessionNumberAsc(courseId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResponse getById(Long courseId, Long id) {
        Session s = getOrThrow(id);
        if (!s.getCourse().getId().equals(courseId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Session không tồn tại trong khóa học này");
        }
        return toResponse(s);
    }

    @Override
    @Transactional
    public SessionResponse addManual(Long courseId, SessionCreateRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));

        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ khóa OFFLINE mới có session");
        }

        sessionValidator.validateForCreate(request,
                course.getTeacher() != null ? course.getTeacher().getId() : null);

        // ── Resolve teacher ──
        Long teacherIdToUse = request.getTeacherId() != null
                ? request.getTeacherId()
                : (course.getTeacher() != null ? course.getTeacher().getId() : null);
        if (teacherIdToUse == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Không xác định được GV chính — course chưa có teacher");
        }
        Account teacher = accountRepository.findById(teacherIdToUse)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại"));

        // ── Resolve substitute (normalize nếu trùng teacher) ──
        Account substitute = null;
        if (request.getSubstituteTeacherId() != null
                && !request.getSubstituteTeacherId().equals(teacher.getId())) {
            substitute = accountRepository.findById(request.getSubstituteTeacherId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                            "GV dạy thay không tồn tại"));
        }

        // ── Resolve assistant ──
        Account assistant = null;
        if (request.getAssistantId() != null) {
            assistant = accountRepository.findById(request.getAssistantId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                            "Trợ giảng không tồn tại"));
        }

        // ── Resolve room (override) ──
        Room room = null;
        if (request.getRoomId() != null) {
            room = roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại"));
        }

        // ══════════ CONFLICT CHECK (Q4=A, FR_CRS_007) ══════════
        Long effectiveTeacherId = substitute != null ? substitute.getId() : teacher.getId();
        List<Session> teacherConflicts = sessionRepository.findTeacherConflicts(
                effectiveTeacherId, request.getStartTime(), request.getEndTime(), null);
        if (!teacherConflicts.isEmpty()) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "GV hiệu lực trùng lịch với session khác");
        }

        Long effectiveRoomId = room != null
                ? room.getId()
                : (course.getRoom() != null ? course.getRoom().getId() : null);
        if (effectiveRoomId != null) {
            List<Session> roomConflicts = sessionRepository.findRoomConflicts(
                    effectiveRoomId, request.getStartTime(), request.getEndTime(), null);
            if (!roomConflicts.isEmpty()) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "Phòng hiệu lực trùng lịch với session khác");
            }
        }

        Integer nextNum = sessionRepository.maxSessionNumber(courseId) + 1;

        Session s = new Session();
        s.setCourse(course);
        s.setSessionNumber(nextNum);
        s.setTitle(request.getTitle());
        s.setDescription(request.getDescription());
        s.setStartTime(request.getStartTime());
        s.setEndTime(request.getEndTime());
        s.setSessionDate(request.getStartTime().toLocalDate());
        s.setTeacher(teacher);
        s.setSubstituteTeacher(substitute);
        s.setAssistant(assistant);
        s.setRoom(room);
        s.setNote(request.getNote());
        s.setStatus(SessionStatus.SCHEDULED);

        Session saved = sessionRepository.save(s);
        auditLogService.log("CREATE", "SESSION", saved.getId(),
                "Thêm session #" + nextNum + " cho course " + courseId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SessionResponse cancel(Long id, SessionCancelRequest request) {
        Session s = getOrThrow(id);
        if (s.getStatus() == SessionStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Session đã hủy");
        }
        if (s.getStatus() == SessionStatus.DONE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể hủy session đã DONE");
        }
        s.setStatus(SessionStatus.CANCELLED);
        s.setCancelReason(request.getReason());
        Session saved = sessionRepository.save(s);
        auditLogService.log("CANCEL", "SESSION", id, request.getReason());
        progressCalculationService.onSessionChanged(s.getCourse().getId());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SessionResponse markDone(Long sessionId) {
        Session s = getOrThrow(sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Session đã hủy");
        }
        if (s.getStatus() == SessionStatus.RESCHEDULED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Session đã được thay thế");
        }
        if (s.getStatus() == SessionStatus.DONE) {
            return toResponse(s); // idempotent
        }
        s.setStatus(SessionStatus.DONE);
        Session saved = sessionRepository.save(s);
        auditLogService.log("MARK_DONE", "SESSION", sessionId, null);
        progressCalculationService.onSessionChanged(s.getCourse().getId());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SessionResponse assignSubstituteTeacher(Long sessionId, Long substituteTeacherId) {
        Session s = getOrThrow(sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED || s.getStatus() == SessionStatus.DONE) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Không thể gán GV dạy thay cho session đã " + s.getStatus());
        }

        if (substituteTeacherId == null) {
            s.setSubstituteTeacher(null);
        } else if (s.getTeacher() != null && substituteTeacherId.equals(s.getTeacher().getId())) {
            s.setSubstituteTeacher(null); // normalize về null (BA §5.10)
        } else {
            Account sub = accountRepository.findById(substituteTeacherId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                            "GV dạy thay không tồn tại"));
            List<Session> conflicts = sessionRepository.findTeacherConflicts(
                    substituteTeacherId, s.getStartTime(), s.getEndTime(), s.getId());
            if (!conflicts.isEmpty()) {
                throw new ErrorHandler(HttpStatus.CONFLICT,
                        "GV dạy thay trùng lịch với session khác");
            }
            s.setSubstituteTeacher(sub);
        }

        Session saved = sessionRepository.save(s);
        auditLogService.log("ASSIGN_SUBSTITUTE", "SESSION", sessionId,
                "substituteTeacherId=" + substituteTeacherId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SessionResponse assignAssistant(Long sessionId, Long assistantId) {
        Session s = getOrThrow(sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Không thể gán trợ giảng cho session đã hủy");
        }
        if (assistantId == null) {
            s.setAssistant(null);
        } else {
            Account a = accountRepository.findById(assistantId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                            "Trợ giảng không tồn tại"));
            s.setAssistant(a);
        }
        Session saved = sessionRepository.save(s);
        auditLogService.log("ASSIGN_ASSISTANT", "SESSION", sessionId,
                "assistantId=" + assistantId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void changeCourseMainTeacher(Long courseId, Long newTeacherId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        Account newTeacher = accountRepository.findById(newTeacherId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại"));

        Account oldTeacher = course.getTeacher();
        if (oldTeacher != null && oldTeacher.getId().equals(newTeacherId)) {
            log.info("Đổi GV chính course {}: GV mới trùng GV cũ — bỏ qua", courseId);
            return;
        }

        // 1. Update course.teacher_id
        course.setTeacher(newTeacher);
        courseRepository.save(course);

        // 2. Sync session SCHEDULED chưa có dạy thay (BA §5.10)
        List<Session> scheduled = sessionRepository.findScheduledSessionsWithoutSubstitute(courseId);
        for (Session s : scheduled) {
            s.setTeacher(newTeacher);
        }
        if (!scheduled.isEmpty()) {
            sessionRepository.saveAll(scheduled);
        }

        // 3. Audit log
        auditLogService.log("CHANGE_MAIN_TEACHER", "COURSE", courseId,
                String.format("oldTeacher=%s, newTeacher=%s, sessionsSynced=%d",
                        oldTeacher != null ? oldTeacher.getId() : null,
                        newTeacherId, scheduled.size()));
        log.info("Đổi GV chính course {}: {} → {}, sync {} session",
                courseId,
                oldTeacher != null ? oldTeacher.getId() : null,
                newTeacherId, scheduled.size());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Session s = getOrThrow(id);
        if (s.getStatus() == SessionStatus.DONE) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể xóa session đã DONE");
        }
        sessionRepository.delete(s);
        auditLogService.log("DELETE", "SESSION", id, null);
    }

    @Override
    @Transactional
    public com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult generateSessions(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));

        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Chỉ sinh session cho khóa OFFLINE");
        }
        if (course.getStartDate() == null || course.getEndDate() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course thiếu start_date/end_date");
        }
        if (course.getScheduleDays() == null || course.getScheduleDays().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course thiếu schedule_days");
        }
        if (course.getSessionStartTime() == null || course.getSessionEndTime() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course thiếu session_start/end_time");
        }
        if (course.getTeacher() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course chưa có teacher_id — không thể sinh session");
        }
        if (course.getRoom() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course chưa có room_id — không thể sinh session");
        }

        // Idempotent: đã có session → skip
        long existingCount = sessionRepository.countByCourse_Id(courseId);
        if (existingCount > 0) {
            return com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult.builder()
                    .courseId(courseId)
                    .totalDates(0)
                    .generated(0)
                    .message("Course đã có " + existingCount + " session — không sinh lại")
                    .build();
        }

        // Danh sách ngày khớp schedule_days
        java.util.List<java.time.LocalDate> dates = new java.util.ArrayList<>();
        java.time.LocalDate cur = course.getStartDate();
        while (!cur.isAfter(course.getEndDate())) {
            int dow = (cur.getDayOfWeek().getValue() % 7) + 1; // 1=CN..7=T7
            if (course.getScheduleDays().contains(dow)) {
                dates.add(cur);
            }
            cur = cur.plusDays(1);
        }
        if (dates.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Không có ngày nào khớp schedule_days trong khoảng start..end");
        }
        if (dates.size() > 500) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Số session cần sinh (" + dates.size() + ") vượt quá giới hạn 500");
        }

        // Sinh + conflict check
        java.util.List<Session> toSave = new java.util.ArrayList<>();
        java.util.List<com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult.SkippedDate> skipped
                = new java.util.ArrayList<>();
        int counter = 0;

        Long teacherId = course.getTeacher().getId();
        Long roomId = course.getRoom().getId();

        for (java.time.LocalDate date : dates) {
            java.time.LocalDateTime start = java.time.LocalDateTime.of(date, course.getSessionStartTime());
            java.time.LocalDateTime end = java.time.LocalDateTime.of(date, course.getSessionEndTime());

            boolean teacherConflict = !sessionRepository.findTeacherConflicts(
                    teacherId, start, end, null).isEmpty();
            if (teacherConflict) {
                skipped.add(new com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult.SkippedDate(
                        date, "GV bận"));
                continue;
            }
            boolean roomConflict = !sessionRepository.findRoomConflicts(
                    roomId, start, end, null).isEmpty();
            if (roomConflict) {
                skipped.add(new com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult.SkippedDate(
                        date, "Phòng bận"));
                continue;
            }

            Session s = new Session();
            s.setCourse(course);
            s.setSessionNumber(++counter);
            s.setTitle("Buổi " + counter);
            s.setStartTime(start);
            s.setEndTime(end);
            s.setSessionDate(date);
            s.setTeacher(course.getTeacher());
            s.setRoom(null); // kế thừa course.room_id
            s.setStatus(SessionStatus.SCHEDULED);
            toSave.add(s);
        }

        if (toSave.isEmpty()) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Tất cả " + dates.size() + " ngày đều conflict — không sinh được session nào");
        }

        sessionRepository.saveAll(toSave);
        auditLogService.log("GENERATE_SESSIONS", "COURSE", courseId,
                "generated=" + toSave.size() + ", skipped=" + skipped.size());

        return com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult.builder()
                .courseId(courseId)
                .totalDates(dates.size())
                .generated(toSave.size())
                .skipped(skipped)
                .message("Sinh " + toSave.size() + "/" + dates.size() + " session")
                .build();
    }

    private Session getOrThrow(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Session không tồn tại"));
    }

    private SessionResponse toResponse(Session s) {
        SessionResponse r = new SessionResponse();
        r.setId(s.getId());
        r.setCourseId(s.getCourse().getId());
        r.setSessionNumber(s.getSessionNumber());
        r.setTitle(s.getTitle());
        r.setDescription(s.getDescription());
        r.setStartTime(s.getStartTime());
        r.setEndTime(s.getEndTime());
        r.setSessionDate(s.getSessionDate());

        if (s.getTeacher() != null) {
            r.setTeacherId(s.getTeacher().getId());
            r.setTeacherName(fullNameOf(s.getTeacher()));
        }
        if (s.getSubstituteTeacher() != null) {
            r.setSubstituteTeacherId(s.getSubstituteTeacher().getId());
            r.setSubstituteTeacherName(fullNameOf(s.getSubstituteTeacher()));
        }
        if (s.getAssistant() != null) {
            r.setAssistantId(s.getAssistant().getId());
            r.setAssistantName(fullNameOf(s.getAssistant()));
        }
        if (s.getRoom() != null) {
            r.setRoomId(s.getRoom().getId());
            r.setRoomName(s.getRoom().getName());
        }

        r.setEffectiveTeacherId(s.getEffectiveTeacherId());
        Account effTeacher = s.getSubstituteTeacher() != null
                ? s.getSubstituteTeacher() : s.getTeacher();
        if (effTeacher != null) r.setEffectiveTeacherName(fullNameOf(effTeacher));

        r.setEffectiveRoomId(s.getEffectiveRoomId());
        Room effRoom = s.getRoom() != null
                ? s.getRoom()
                : (s.getCourse() != null ? s.getCourse().getRoom() : null);
        if (effRoom != null) r.setEffectiveRoomName(effRoom.getName());

        r.setStatus(s.getStatus() != null ? s.getStatus().name() : null);
        r.setCancelReason(s.getCancelReason());
        r.setNote(s.getNote());
        r.setRescheduledFromId(s.getRescheduledFromId());
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }

    private static String fullNameOf(Account a) {
        if (a == null) return null;
        return a.getUserProfile() != null ? a.getUserProfile().getFullName() : a.getEmail();
    }
}