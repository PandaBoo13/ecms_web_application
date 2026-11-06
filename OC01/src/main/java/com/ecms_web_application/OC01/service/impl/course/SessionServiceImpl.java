package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult;
import com.ecms_web_application.OC01.dto.response.course.SessionResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.Room;
import com.ecms_web_application.OC01.entity.course.Session;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

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

        Long teacherIdToUse = request.getTeacherId() != null
                ? request.getTeacherId()
                : (course.getTeacher() != null ? course.getTeacher().getId() : null);
        if (teacherIdToUse == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Không xác định được GV chính — course chưa có teacher");
        }
        Account teacher = accountRepository.findById(teacherIdToUse)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại"));

        Account substitute = null;
        if (request.getSubstituteTeacherId() != null
                && !request.getSubstituteTeacherId().equals(teacher.getId())) {
            substitute = accountRepository.findById(request.getSubstituteTeacherId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                            "GV dạy thay không tồn tại"));
        }

        Account assistant = null;
        if (request.getAssistantId() != null) {
            assistant = accountRepository.findById(request.getAssistantId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                            "Trợ giảng không tồn tại"));
        }

        Room room = null;
        if (request.getRoomId() != null) {
            room = roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại"));
        }

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
        if (s.getStatus() == SessionStatus.COMPLETED) {
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
        if (s.getStatus() == SessionStatus.COMPLETED) {
            return toResponse(s); // idempotent
        }
        s.setStatus(SessionStatus.COMPLETED);
        Session saved = sessionRepository.save(s);
        auditLogService.log("MARK_DONE", "SESSION", sessionId, null);
        progressCalculationService.onSessionChanged(s.getCourse().getId());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SessionResponse assignSubstituteTeacher(Long sessionId, Long substituteTeacherId) {
        Session s = getOrThrow(sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED || s.getStatus() == SessionStatus.COMPLETED) {
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

        course.setTeacher(newTeacher);
        courseRepository.save(course);

        List<Session> scheduled = sessionRepository.findScheduledSessionsWithoutSubstitute(courseId);
        for (Session s : scheduled) {
            s.setTeacher(newTeacher);
        }
        if (!scheduled.isEmpty()) {
            sessionRepository.saveAll(scheduled);
        }

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
        if (s.getStatus() == SessionStatus.COMPLETED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể xóa session đã DONE");
        }
        sessionRepository.delete(s);
        auditLogService.log("DELETE", "SESSION", id, null);
    }

    // ============================================================
    // GENERATE SESSIONS — sinh DRAFT, đủ total_sessions_expected
    // ============================================================
    @Override
    @Transactional
    public SessionGenerationResult generateSessions(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Khóa học không tồn tại"));

        // ── 1. Validate course ──
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Chỉ sinh session cho khóa OFFLINE");
        }
        if (course.getStartDate() == null || course.getEndDate() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course thiếu start_date/end_date");
        }
        if (course.getEndDate().isBefore(course.getStartDate())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "end_date phải >= start_date (start=" + course.getStartDate()
                            + ", end=" + course.getEndDate() + ")");
        }
        if (course.getScheduleDays() == null || course.getScheduleDays().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course thiếu schedule_days");
        }
        if (course.getSessionStartTime() == null || course.getSessionEndTime() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course thiếu session_start/end_time");
        }
        if (!course.getSessionStartTime().isBefore(course.getSessionEndTime())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "session_start_time phải < session_end_time");
        }
        if (course.getTeacher() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course chưa có teacher_id — không thể sinh session");
        }
        if (course.getRoom() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course chưa có room_id — không thể sinh session");
        }

        Integer expected = course.getTotalSessionsExpected();
        if (expected == null || expected <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Course chưa cấu hình total_sessions_expected (> 0)");
        }

        // ── 2. Quét ngày khớp schedule_days ──
        List<LocalDate> matchedDates = new ArrayList<>();
        LocalDate cur = course.getStartDate();
        while (!cur.isAfter(course.getEndDate())) {
            int dow = (cur.getDayOfWeek().getValue() % 7) + 1; // 1=CN..7=T7
            if (course.getScheduleDays().contains(dow)) {
                matchedDates.add(cur);
            }
            cur = cur.plusDays(1);
        }

        if (matchedDates.size() < expected) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Khoảng [" + course.getStartDate() + " → " + course.getEndDate()
                            + "] chỉ có " + matchedDates.size()
                            + " buổi khớp schedule_days, nhưng cần " + expected
                            + " buổi. Vui lòng mở rộng end_date hoặc thêm thứ.");
        }

        // Cắt đúng expected buổi (N buổi đầu)
        List<LocalDate> targetDates = matchedDates.subList(0, expected);
        if (matchedDates.size() > expected) {
            log.info("[Generate] Cắt {} buổi dư (matched={}, expected={})",
                    matchedDates.size() - expected, matchedDates.size(), expected);
        }

        // ── 3. Session đã có (không tính CANCELLED) ──
        List<Session> existing = sessionRepository
                .findByCourse_IdOrderBySessionNumberAsc(courseId);
        Set<LocalDate> existingDates = existing.stream()
                .filter(s -> s.getStatus() != SessionStatus.CANCELLED)
                .map(Session::getSessionDate)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        // ── 4. Ngày cần sinh thêm ──
        List<LocalDate> datesToGenerate = targetDates.stream()
                .filter(d -> !existingDates.contains(d))
                .toList();

        if (datesToGenerate.isEmpty()) {
            return SessionGenerationResult.builder()
                    .courseId(courseId)
                    .totalDates(matchedDates.size())
                    .generated(0)
                    .message("Đã đủ " + existingDates.size() + "/" + expected
                            + " session — không cần sinh thêm")
                    .build();
        }

        // ── 5. Sinh DRAFT + conflict check (exclude course hiện tại) ──
        List<Session> toSave = new ArrayList<>();
        List<SessionGenerationResult.SkippedDate> skipped = new ArrayList<>();
        int nextNumber = existing.stream()
                .mapToInt(s -> s.getSessionNumber() != null ? s.getSessionNumber() : 0)
                .max().orElse(0) + 1;

        Long teacherId = course.getTeacher().getId();
        Long roomId = course.getRoom().getId();

        for (LocalDate date : datesToGenerate) {
            LocalDateTime start = LocalDateTime.of(date, course.getSessionStartTime());
            LocalDateTime end = LocalDateTime.of(date, course.getSessionEndTime());

            boolean teacherConflict = !sessionRepository
                    .findTeacherConflictsExcludingCourse(teacherId, start, end, courseId)
                    .isEmpty();
            if (teacherConflict) {
                skipped.add(new SessionGenerationResult.SkippedDate(date, "GV bận (course khác)"));
                continue;
            }
            boolean roomConflict = !sessionRepository
                    .findRoomConflictsExcludingCourse(roomId, start, end, courseId)
                    .isEmpty();
            if (roomConflict) {
                skipped.add(new SessionGenerationResult.SkippedDate(date, "Phòng bận (course khác)"));
                continue;
            }

            Session s = new Session();
            s.setCourse(course);
            s.setSessionNumber(nextNumber++);
            s.setTitle("Buổi " + s.getSessionNumber());
            s.setStartTime(start);
            s.setEndTime(end);
            s.setSessionDate(date);
            s.setTeacher(course.getTeacher());
            s.setRoom(null); // kế thừa course.room_id
            // FR_CRS_006 + State Transition dòng 1: sinh DRAFT, admin gán room/teacher xong mới finalize
            s.setStatus(SessionStatus.DRAFT);
            toSave.add(s);
        }

        if (toSave.isEmpty()) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Tất cả " + datesToGenerate.size()
                            + " ngày đều conflict — không sinh được session nào. Chi tiết: " + skipped);
        }

        sessionRepository.saveAll(toSave);
        int newTotal = existingDates.size() + toSave.size();
        auditLogService.log("GENERATE_SESSIONS", "COURSE", courseId,
                "generated=" + toSave.size() + ", skipped=" + skipped.size()
                        + ", total=" + newTotal + "/" + expected);

        String msg = "Sinh " + toSave.size() + " session (tổng " + newTotal + "/" + expected + ")";
        if (!skipped.isEmpty()) {
            msg += ". Bỏ qua " + skipped.size() + " ngày do conflict";
        }

        return SessionGenerationResult.builder()
                .courseId(courseId)
                .totalDates(matchedDates.size())
                .generated(toSave.size())
                .skipped(skipped)
                .message(msg)
                .build();
    }

    // ============================================================
    // HELPERS
    // ============================================================
    private Session getOrThrow(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND,
                        "Session không tồn tại"));
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