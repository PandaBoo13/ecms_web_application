package com.ecms_web_application.OC01.service.impl.course;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.*;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.course.Room;
import com.ecms_web_application.OC01.entity.course.Session;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.SessionStatus;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.mapper.CourseModuleMapper;
import com.ecms_web_application.OC01.generic.validator.SessionValidator;
import com.ecms_web_application.OC01.repository.*;
import com.ecms_web_application.OC01.service.AuditLogService;
import com.ecms_web_application.OC01.service.NotificationService;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
import com.ecms_web_application.OC01.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
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
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final NotificationService notificationService;
    private final CourseModuleMapper mapper;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    // ============================================================
    // READ OPERATIONS
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> listByCourse(Long courseId) {
        return sessionRepository.findByCourse_IdOrderBySessionNumberAsc(courseId)
                .stream()
                .map(mapper::toSessionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResponse getById(Long courseId, Long id) {
        Session s = getOrThrow(id);
        if (!s.getCourse().getId().equals(courseId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Session không tồn tại trong khóa học này");
        }
        return mapper.toSessionResponse(s);
    }

    // ============================================================
    // ADD MANUAL SESSION -> Gửi thông báo cho Instructor của course
    // ============================================================
    // ============================================================
    // ADD MANUAL SESSION -> Gửi thông báo cho Instructor & Student
    // ============================================================
    @Override
    @Transactional
    public SessionResponse addManual(Long courseId, SessionCreateRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));

        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ khóa OFFLINE mới có session");
        }

        sessionValidator.validateForCreate(request, course.getTeacher() != null ? course.getTeacher().getId() : null);

        Long teacherIdToUse = request.getTeacherId() != null
                ? request.getTeacherId()
                : (course.getTeacher() != null ? course.getTeacher().getId() : null);
        if (teacherIdToUse == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không xác định được GV chính — course chưa có teacher");
        }
        Account teacher = accountRepository.findById(teacherIdToUse)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại"));

        Account substitute = null;
        if (request.getSubstituteTeacherId() != null && !request.getSubstituteTeacherId().equals(teacher.getId())) {
            substitute = accountRepository.findById(request.getSubstituteTeacherId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV dạy thay không tồn tại"));
        }

        Account assistant = null;
        if (request.getAssistantId() != null) {
            assistant = accountRepository.findById(request.getAssistantId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Trợ giảng không tồn tại"));
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
            throw new ErrorHandler(HttpStatus.CONFLICT, "GV hiệu lực trùng lịch với session khác");
        }

        Long effectiveRoomId = room != null
                ? room.getId()
                : (course.getRoom() != null ? course.getRoom().getId() : null);
        if (effectiveRoomId != null) {
            List<Session> roomConflicts = sessionRepository.findRoomConflicts(
                    effectiveRoomId, request.getStartTime(), request.getEndTime(), null);
            if (!roomConflicts.isEmpty()) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Phòng hiệu lực trùng lịch với session khác");
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
        auditLogService.log("CREATE", "SESSION", saved.getId(), "Thêm session #" + nextNum + " cho course " + courseId);

        Room displayRoom = saved.getRoom() != null ? saved.getRoom() : course.getRoom();
        String roomInfo = displayRoom != null ? " - Phòng: " + displayRoom.getName() : "";
        String scheduleText = formatSessionSchedule(saved);
        String titleText = StringUtils.hasText(saved.getTitle()) ? saved.getTitle() : "Buổi " + saved.getSessionNumber();

        // =========================================================
        // 1. GỬI THÔNG BÁO CHO GIẢNG VIÊN / TRỢ GIẢNG
        // =========================================================
        Set<Long> instructorIds = collectSessionInstructorIds(course, saved);
        sendSessionNotification(
                instructorIds,
                course,
                saved,
                "SESSION_CREATED",
                "Buổi dạy mới được tạo",
                String.format("Buổi #%d (%s) của khóa học \"%s\" (%s) vừa được tạo vào %s%s.",
                        saved.getSessionNumber(),
                        titleText,
                        course.getTitle(),
                        course.getCode(),
                        scheduleText,
                        roomInfo),
                "NORMAL",
                false
        );

        // =========================================================
        // 2. GỬI THÔNG BÁO CHO HỌC VIÊN (PENDING, ACTIVE, RESERVED)
        // =========================================================
        Set<Long> studentAccountIds = collectEnrolledStudentAccountIds(course.getId());
        if (!studentAccountIds.isEmpty()) {
            sendSessionNotification(
                    studentAccountIds,
                    course,
                    saved,
                    "SESSION_CREATED",
                    "Lịch học mới được cập nhật",
                    String.format("Buổi học mới #%d (%s) của khóa học \"%s\" (%s) vừa được thêm vào lịch. Vui lòng chú ý theo dõi thời khóa biểu.%s",
                            saved.getSessionNumber(),
                            titleText,
                            course.getTitle(),
                            course.getCode(),
                            roomInfo),
                    "NORMAL",
                    false
            );
        }

        return mapper.toSessionResponse(saved);
    }

    // ============================================================
    // CANCEL SESSION -> Thông báo cho Instructor & Student ACTIVE
    // ============================================================
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

        Course course = saved.getCourse();
        String reasonText = StringUtils.hasText(request.getReason()) ? " Lý do: " + request.getReason() : "";
        String scheduleInfo = String.format("Buổi #%d (%s) của khóa học \"%s\" (%s) đã bị hủy.",
                saved.getSessionNumber(),
                formatSessionSchedule(saved),
                course.getTitle(),
                course.getCode());

        // =========================================================
        // 1. GỬI THÔNG BÁO CHO GIẢNG VIÊN / TRỢ GIẢNG
        // =========================================================
        Set<Long> instructorIds = collectSessionInstructorIds(course, saved);
        sendSessionNotification(
                instructorIds,
                course,
                saved,
                "SESSION_CANCELLED",
                "Thông báo hủy buổi dạy",
                scheduleInfo + reasonText,
                "HIGH",
                true
        );

        // =========================================================
        // 2. GỬI THÔNG BÁO RIÊNG CHO HỌC VIÊN
        // =========================================================
        Set<Long> studentAccountIds = collectEnrolledStudentAccountIds(course.getId());
        if (!studentAccountIds.isEmpty()) {
            sendSessionNotification(
                    studentAccountIds,
                    course,
                    saved,
                    "SESSION_CANCELLED",
                    "Thông báo hủy buổi học",
                    scheduleInfo + reasonText + " Vui lòng theo dõi thông báo tiếp theo từ trung tâm để biết lịch học bù (nếu có).",
                    "HIGH",
                    true
            );
        }

        return mapper.toSessionResponse(saved);
    }

    // ============================================================
    // MARK DONE
    // ============================================================
    @Override
    @Transactional
    public SessionResponse markDone(Long sessionId) {
        Session s = getOrThrow(sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Session đã hủy");
        }
        if (s.getStatus() == SessionStatus.COMPLETED) {
            return mapper.toSessionResponse(s);
        }

        s.setStatus(SessionStatus.COMPLETED);
        Session saved = sessionRepository.save(s);
        auditLogService.log("MARK_DONE", "SESSION", sessionId, null);
        progressCalculationService.onSessionChanged(s.getCourse().getId());
        return mapper.toSessionResponse(saved);
    }

    // ============================================================
    // ASSIGN SUBSTITUTE TEACHER -> Thông báo cho Instructor & Student ACTIVE
    // ============================================================
    @Override
    @Transactional
    public SessionResponse assignSubstituteTeacher(Long sessionId, Long substituteTeacherId) {
        Session s = getOrThrow(sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED || s.getStatus() == SessionStatus.COMPLETED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể gán GV dạy thay cho session đã " + s.getStatus());
        }

        Account oldSubstitute = s.getSubstituteTeacher();
        Long oldSubId = oldSubstitute != null ? oldSubstitute.getId() : null;

        if (substituteTeacherId == null) {
            s.setSubstituteTeacher(null);
        } else if (s.getTeacher() != null && substituteTeacherId.equals(s.getTeacher().getId())) {
            s.setSubstituteTeacher(null);
        } else {
            Account sub = accountRepository.findById(substituteTeacherId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV dạy thay không tồn tại"));
            List<Session> conflicts = sessionRepository.findTeacherConflicts(
                    substituteTeacherId, s.getStartTime(), s.getEndTime(), s.getId());
            if (!conflicts.isEmpty()) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "GV dạy thay trùng lịch với session khác");
            }
            s.setSubstituteTeacher(sub);
        }

        Session saved = sessionRepository.save(s);
        auditLogService.log("ASSIGN_SUBSTITUTE", "SESSION", sessionId, "substituteTeacherId=" + substituteTeacherId);

        Long newSubId = saved.getSubstituteTeacher() != null ? saved.getSubstituteTeacher().getId() : null;
        if (!Objects.equals(oldSubId, newSubId)) {
            Course course = saved.getCourse();
            Set<Long> recipientIds = collectAllRelatedAccountIds(course, saved);
            if (oldSubId != null) {
                recipientIds.add(oldSubId);
            }

            String detail = saved.getSubstituteTeacher() != null
                    ? String.format("Giảng viên %s sẽ dạy thay cho buổi #%d (%s) của khóa học \"%s\" (%s).",
                    resolveAccountDisplayName(saved.getSubstituteTeacher()),
                    saved.getSessionNumber(),
                    formatSessionSchedule(saved),
                    course.getTitle(),
                    course.getCode())
                    : String.format("Buổi #%d (%s) của khóa học \"%s\" (%s) đã hủy phân công dạy thay và quay lại giảng viên chính.",
                    saved.getSessionNumber(),
                    formatSessionSchedule(saved),
                    course.getTitle(),
                    course.getCode());

            sendSessionNotification(
                    recipientIds,
                    course,
                    saved,
                    "SESSION_UPDATED",
                    "Điều chỉnh giảng viên buổi học",
                    detail,
                    "HIGH",
                    true
            );
        }

        return mapper.toSessionResponse(saved);
    }

    // ============================================================
    // ASSIGN ASSISTANT -> Thông báo cho Instructor & Student ACTIVE
    // ============================================================
    @Override
    @Transactional
    public SessionResponse assignAssistant(Long sessionId, Long assistantId) {
        Session s = getOrThrow(sessionId);
        if (s.getStatus() == SessionStatus.CANCELLED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể gán trợ giảng cho session đã hủy");
        }

        Account oldAssistant = s.getAssistant();
        Long oldAssistantId = oldAssistant != null ? oldAssistant.getId() : null;

        if (assistantId == null) {
            s.setAssistant(null);
        } else {
            Account a = accountRepository.findById(assistantId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Trợ giảng không tồn tại"));
            s.setAssistant(a);
        }

        Session saved = sessionRepository.save(s);
        auditLogService.log("ASSIGN_ASSISTANT", "SESSION", sessionId, "assistantId=" + assistantId);

        Long newAssistantId = saved.getAssistant() != null ? saved.getAssistant().getId() : null;
        if (!Objects.equals(oldAssistantId, newAssistantId)) {
            Course course = saved.getCourse();
            Set<Long> recipientIds = collectAllRelatedAccountIds(course, saved);
            if (oldAssistantId != null) {
                recipientIds.add(oldAssistantId);
            }

            String detail = saved.getAssistant() != null
                    ? String.format("Trợ giảng %s đã được phân công hỗ trợ buổi #%d (%s) của khóa học \"%s\" (%s).",
                    resolveAccountDisplayName(saved.getAssistant()),
                    saved.getSessionNumber(),
                    formatSessionSchedule(saved),
                    course.getTitle(),
                    course.getCode())
                    : String.format("Buổi #%d (%s) của khóa học \"%s\" (%s) đã gỡ phân công trợ giảng.",
                    saved.getSessionNumber(),
                    formatSessionSchedule(saved),
                    course.getTitle(),
                    course.getCode());

            sendSessionNotification(
                    recipientIds,
                    course,
                    saved,
                    "SESSION_UPDATED",
                    "Điều chỉnh trợ giảng buổi học",
                    detail,
                    "NORMAL",
                    false
            );
        }

        return mapper.toSessionResponse(saved);
    }

    // ============================================================
    // CHANGE COURSE MAIN TEACHER -> Thông báo cho Instructor & Student ACTIVE
    // ============================================================
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
                        oldTeacher != null ? oldTeacher.getId() : null, newTeacherId, scheduled.size()));

        if (!scheduled.isEmpty()) {
            Set<Long> recipientIds = new LinkedHashSet<>();
            if (oldTeacher != null) {
                recipientIds.add(oldTeacher.getId());
            }
            recipientIds.add(newTeacher.getId());
            for (Session s : scheduled) {
                if (s.getAssistant() != null) {
                    recipientIds.add(s.getAssistant().getId());
                }
            }
            recipientIds.addAll(collectActiveStudentAccountIds(courseId));

            sendSessionNotification(
                    recipientIds,
                    course,
                    null,
                    "SESSION_UPDATED",
                    "Điều chỉnh giảng viên chính các buổi học",
                    String.format("Giảng viên %s đã được phân công phụ trách %d buổi học sắp tới của khóa học \"%s\" (%s).",
                            resolveAccountDisplayName(newTeacher),
                            scheduled.size(),
                            course.getTitle(),
                            course.getCode()),
                    "HIGH",
                    true
            );
        }
    }

    // ============================================================
    // DELETE SESSION -> Thông báo cho Instructor (và Student nếu đã SCHEDULED)
    // ============================================================
    @Override
    @Transactional
    public void delete(Long id) {
        Session s = getOrThrow(id);
        if (s.getStatus() == SessionStatus.COMPLETED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không thể xóa session đã DONE");
        }

        Course course = s.getCourse();
        Integer sessionNumber = s.getSessionNumber();
        String scheduleText = formatSessionSchedule(s);
        boolean wasPublishedSchedule = s.getStatus() == SessionStatus.SCHEDULED;

        Set<Long> recipientIds = wasPublishedSchedule
                ? collectAllRelatedAccountIds(course, s)
                : collectSessionInstructorIds(course, s);

        sessionRepository.delete(s);
        auditLogService.log("DELETE", "SESSION", id, null);

        sendSessionNotification(
                recipientIds,
                course,
                null,
                "SESSION_DELETED",
                "Buổi học đã bị xóa khỏi lịch",
                String.format("Buổi #%d (%s) của khóa học \"%s\" (%s) đã bị xóa khỏi thời khóa biểu.",
                        sessionNumber,
                        scheduleText,
                        course.getTitle(),
                        course.getCode()),
                wasPublishedSchedule ? "HIGH" : "NORMAL",
                wasPublishedSchedule
        );
    }

    // ============================================================
    // GENERATE SESSIONS -> Gửi 1 thông báo tổng hợp cho Instructor của course
    // ============================================================
    @Override
    @Transactional
    public SessionGenerationResult generateSessions(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));

        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ sinh session cho khóa OFFLINE");
        }
        if (course.getStartDate() == null || course.getEndDate() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course thiếu start_date/end_date");
        }
        if (course.getEndDate().isBefore(course.getStartDate())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "end_date phải >= start_date");
        }
        if (course.getScheduleDays() == null || course.getScheduleDays().isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course thiếu schedule_days");
        }
        if (course.getSessionStartTime() == null || course.getSessionEndTime() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course thiếu session_start/end_time");
        }
        if (!course.getSessionStartTime().isBefore(course.getSessionEndTime())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "session_start_time phải < session_end_time");
        }
        if (course.getTeacher() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course chưa có teacher_id");
        }
        if (course.getRoom() == null) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course chưa có room_id");
        }

        Integer expected = course.getTotalSessionsExpected();
        if (expected == null || expected <= 0) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Course chưa cấu hình total_sessions_expected (> 0)");
        }

        List<LocalDate> matchedDates = new ArrayList<>();
        LocalDate cur = course.getStartDate();
        while (!cur.isAfter(course.getEndDate())) {
            int dow = (cur.getDayOfWeek().getValue() % 7) + 1;
            if (course.getScheduleDays().contains(dow)) {
                matchedDates.add(cur);
            }
            cur = cur.plusDays(1);
        }

        if (matchedDates.size() < expected) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Khoảng [" + course.getStartDate() + " → " + course.getEndDate() + "] chỉ có "
                            + matchedDates.size() + " buổi khớp schedule_days, nhưng cần " + expected + " buổi.");
        }

        List<LocalDate> targetDates = matchedDates.subList(0, expected);
        List<Session> existing = sessionRepository.findByCourse_IdOrderBySessionNumberAsc(courseId);
        Set<LocalDate> existingDates = existing.stream()
                .filter(s -> s.getStatus() != SessionStatus.CANCELLED)
                .map(Session::getSessionDate)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<LocalDate> datesToGenerate = targetDates.stream()
                .filter(d -> !existingDates.contains(d))
                .toList();

        if (datesToGenerate.isEmpty()) {
            return SessionGenerationResult.builder()
                    .courseId(courseId)
                    .totalDates(matchedDates.size())
                    .generated(0)
                    .message("Đã đủ " + existingDates.size() + "/" + expected + " session — không cần sinh thêm")
                    .build();
        }

        List<Session> toSave = new ArrayList<>();
        List<SessionGenerationResult.SkippedDate> skipped = new ArrayList<>();
        int nextNumber = existing.stream()
                .mapToInt(s -> s.getSessionNumber() != null ? s.getSessionNumber() : 0)
                .max()
                .orElse(0) + 1;

        Long teacherId = course.getTeacher().getId();
        Long roomId = course.getRoom().getId();

        for (LocalDate date : datesToGenerate) {
            LocalDateTime start = LocalDateTime.of(date, course.getSessionStartTime());
            LocalDateTime end = LocalDateTime.of(date, course.getSessionEndTime());

            if (!sessionRepository.findTeacherConflictsExcludingCourse(teacherId, start, end, courseId).isEmpty()) {
                skipped.add(new SessionGenerationResult.SkippedDate(date, "GV bận (course khác)"));
                continue;
            }
            if (!sessionRepository.findRoomConflictsExcludingCourse(roomId, start, end, courseId).isEmpty()) {
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
            s.setRoom(null);
            s.setStatus(SessionStatus.DRAFT);
            toSave.add(s);
        }

        if (toSave.isEmpty()) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Tất cả " + datesToGenerate.size() + " ngày đều conflict — không sinh được session nào.");
        }

        sessionRepository.saveAll(toSave);
        int newTotal = existingDates.size() + toSave.size();
        auditLogService.log("GENERATE_SESSIONS", "COURSE", courseId,
                "generated=" + toSave.size() + ", skipped=" + skipped.size() + ", total=" + newTotal + "/" + expected);

        // Thông báo tổng hợp cho giảng viên chính của khóa học
        if (course.getTeacher() != null) {
            LocalDate firstDate = toSave.get(0).getSessionDate();
            LocalDate lastDate = toSave.get(toSave.size() - 1).getSessionDate();
            sendSessionNotification(
                    Set.of(course.getTeacher().getId()),
                    course,
                    null,
                    "SESSION_GENERATED",
                    "Khởi tạo danh sách buổi học mới",
                    String.format("Hệ thống vừa tạo %d buổi học dự kiến (từ %s đến %s) cho khóa học \"%s\" (%s).",
                            toSave.size(),
                            firstDate.format(DATE_FMT),
                            lastDate.format(DATE_FMT),
                            course.getTitle(),
                            course.getCode()),
                    "NORMAL",
                    false
            );
        }

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
    // SCHEDULE QUERIES
    // ============================================================
    @Override
    @Transactional(readOnly = true)
    public List<SessionScheduleResponse> getMyInstructorSchedule(Long teacherId, LocalDate from, LocalDate to) {
        List<Session> sessions = sessionRepository.findInstructorScheduleWithCourse(teacherId, from, to);
        if (sessions.isEmpty()) {
            return List.of();
        }

        Set<Long> courseIds = sessions.stream()
                .map(s -> s.getCourse().getId())
                .collect(Collectors.toSet());
        Map<Long, List<SessionScheduleResponse.StudentInfo>> studentsByCourse = new HashMap<>();

        for (Long courseId : courseIds) {
            List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(courseId, EnrollmentStatus.ACTIVE);
            if (enrollments.isEmpty()) {
                studentsByCourse.put(courseId, List.of());
                continue;
            }
            Set<Long> studentIds = enrollments.stream()
                    .map(Enrollment::getStudentId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            List<Student> students = studentRepository.findAllById(studentIds);
            studentsByCourse.put(courseId, students.stream()
                    .map(st -> new SessionScheduleResponse.StudentInfo(
                            st.getId(), st.getStudentCode(), st.getFullName(), st.getEmail(), st.getPhone()))
                    .toList());
        }

        List<SessionScheduleResponse> result = new ArrayList<>();
        for (Session s : sessions) {
            SessionScheduleResponse r = mapper.toSessionScheduleResponse(s);
            r.setStudents(studentsByCourse.getOrDefault(s.getCourse().getId(), List.of()));
            result.add(r);
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionScheduleResponse> getMyStudentSchedule(Long accountId, LocalDate from, LocalDate to) {
        return sessionRepository.findStudentScheduleWithCourse(accountId, from, to)
                .stream()
                .map(mapper::toSessionScheduleResponse)
                .toList();
    }

    private Session getOrThrow(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Session không tồn tại"));
    }

    // ============================================================
    // NOTIFICATION HELPERS
    // ============================================================

    /**
     * Gom Account ID của đội ngũ giảng dạy liên quan (GV chính course, GV chính session, GV dạy thay, trợ giảng).
     */
    private Set<Long> collectSessionInstructorIds(Course course, Session session) {
        Set<Long> ids = new LinkedHashSet<>();
        if (course != null && course.getTeacher() != null) {
            ids.add(course.getTeacher().getId());
        }
        if (session != null) {
            if (session.getTeacher() != null) {
                ids.add(session.getTeacher().getId());
            }
            if (session.getSubstituteTeacher() != null) {
                ids.add(session.getSubstituteTeacher().getId());
            }
            if (session.getAssistant() != null) {
                ids.add(session.getAssistant().getId());
            }
        }
        return ids;
    }

    /**
     * Truy xuất Account ID (Student.userId) của toàn bộ học viên đang ACTIVE trong khóa học.
     */
    private Set<Long> collectActiveStudentAccountIds(Long courseId) {
        List<Enrollment> activeEnrollments = enrollmentRepository.findByCourseIdAndStatus(courseId, EnrollmentStatus.ACTIVE);
        if (activeEnrollments.isEmpty()) {
            return Set.of();
        }
        Set<Long> studentIds = activeEnrollments.stream()
                .map(Enrollment::getStudentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        return studentRepository.findAllById(studentIds).stream()
                .map(Student::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /**
     * Gom toàn bộ người liên quan (Instructor + Student ACTIVE) khi điều chỉnh buổi học.
     */
    private Set<Long> collectAllRelatedAccountIds(Course course, Session session) {
        Set<Long> ids = collectSessionInstructorIds(course, session);
        if (course != null && course.getId() != null) {
            ids.addAll(collectActiveStudentAccountIds(course.getId()));
        }
        return ids;
    }

    /**
     * Lưu thông báo vào DB và đẩy realtime qua NotificationService (tự động loại trừ người đang thao tác).
     */
    private void sendSessionNotification(
            Collection<Long> rawRecipientIds,
            Course course,
            Session session,
            String notificationType,
            String title,
            String content,
            String priority,
            boolean sendEmail
    ) {
        if (rawRecipientIds == null || rawRecipientIds.isEmpty()) {
            return;
        }

        try {
            Long actorId = SecurityUtils.getCurrentAccountId();
            List<Long> receivers = rawRecipientIds.stream()
                    .filter(Objects::nonNull)
                    .filter(id -> !Objects.equals(id, actorId))
                    .distinct()
                    .toList();

            if (receivers.isEmpty()) {
                return;
            }

            Map<String, Object> extra = new LinkedHashMap<>();
            if (course != null) {
                extra.put("courseId", course.getId());
                if (course.getCode() != null) {
                    extra.put("courseCode", course.getCode());
                }
            }
            if (session != null) {
                extra.put("sessionId", session.getId());
                extra.put("sessionNumber", session.getSessionNumber());
                if (session.getSessionDate() != null) {
                    extra.put("sessionDate", session.getSessionDate().toString());
                }
            }

            notificationService.sendNotification(NotificationRequest.builder()
                    .senderAccountId(actorId)
                    .receiverAccountIds(receivers)
                    .notificationType(notificationType)
                    .title(title)
                    .content(content)
                    .referenceType("COURSE")
                    .referenceId(course != null ? course.getId() : null)
                    .extraData(extra)
                    .priority(priority)
                    .sendEmail(sendEmail)
                    .build());
        } catch (Exception e) {
            log.warn("[SessionService] Gửi thông báo {} thất bại (courseId={}): {}",
                    notificationType, course != null ? course.getId() : null, e.getMessage());
        }
    }

    private String formatSessionSchedule(Session s) {
        if (s == null || s.getStartTime() == null) {
            return "";
        }
        String datePart = s.getStartTime().toLocalDate().format(DATE_FMT);
        String startPart = s.getStartTime().toLocalTime().format(TIME_FMT);
        String endPart = s.getEndTime() != null ? s.getEndTime().toLocalTime().format(TIME_FMT) : "";
        return StringUtils.hasText(endPart)
                ? String.format("%s (%s - %s)", datePart, startPart, endPart)
                : String.format("%s (%s)", datePart, startPart);
    }

    private String resolveAccountDisplayName(Account account) {
        if (account == null) {
            return "";
        }
        if (account.getUserProfile() != null && StringUtils.hasText(account.getUserProfile().getFullName())) {
            return account.getUserProfile().getFullName();
        }
        if (StringUtils.hasText(account.getEmail())) {
            return account.getEmail();
        }
        return "#" + account.getId();
    }

    @Override
    @Transactional
    public SessionBulkDeleteResult bulkDelete(Long courseId, List<Long> sessionIds) {
        if (sessionIds == null || sessionIds.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Danh sách session rỗng");
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));

        List<Session> sessions = sessionRepository.findAllById(sessionIds);
        if (sessions.size() != sessionIds.size()) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Một số session không tồn tại");
        }

        // Validate tất cả thuộc cùng course
        for (Session s : sessions) {
            if (!s.getCourse().getId().equals(courseId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Session #" + s.getId() + " không thuộc khóa học này");
            }
        }

        // Tách COMPLETED → skip (không fail toàn batch)
        List<Session> deletable = new ArrayList<>();
        List<Long> skippedIds = new ArrayList<>();
        for (Session s : sessions) {
            if (s.getStatus() == SessionStatus.COMPLETED) {
                skippedIds.add(s.getId());
            } else {
                deletable.add(s);
            }
        }

        if (deletable.isEmpty()) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Không có session nào có thể xóa (tất cả đã COMPLETED)");
        }

        // Gom recipient 1 lần duy nhất (đã tối ưu vòng lặp)
        boolean anyScheduled = deletable.stream()
                .anyMatch(s -> s.getStatus() == SessionStatus.SCHEDULED);

        Set<Long> recipientIds = new LinkedHashSet<>();
        for (Session s : deletable) {
            if (anyScheduled) {
                recipientIds.addAll(collectAllRelatedAccountIds(course, s));
            } else {
                recipientIds.addAll(collectSessionInstructorIds(course, s));
            }
        }

        List<Long> deletedIds = deletable.stream().map(Session::getId).toList();
        sessionRepository.deleteAll(deletable);

        auditLogService.log("BULK_DELETE", "SESSION", null,
                "courseId=" + courseId + ", deleted=" + deletedIds.size()
                        + ", skipped=" + skippedIds.size());

        // 1 notification tổng hợp
        sendSessionNotification(
                recipientIds, course, null,
                "SESSION_BULK_DELETED",
                "Nhiều buổi học đã bị xóa khỏi lịch",
                String.format("%d buổi học của khóa \"%s\" (%s) đã bị xóa khỏi thời khóa biểu.",
                        deletedIds.size(), course.getTitle(), course.getCode()),
                anyScheduled ? "HIGH" : "NORMAL",
                anyScheduled
        );

        // 🟢 SỬA LỖI TẠI ĐÂY: Dùng Builder để truyền đủ 4 tham số
        return SessionBulkDeleteResult.builder()
                .deletedIds(deletedIds)
                .skippedIds(skippedIds)
                .totalRequested(sessionIds.size())
                .message(String.format("Đã xóa %d buổi, bỏ qua %d buổi (đã hoàn thành).",
                        deletedIds.size(), skippedIds.size()))
                .build();
    }
    /**
     * Truy xuất Account ID của toàn bộ học viên đã ghi danh (bao gồm ACTIVE, PENDING, RESERVED).
     * Chỉ sử dụng các hàm có sẵn của EnrollmentRepository.
     */
    private Set<Long> collectEnrolledStudentAccountIds(Long courseId) {
        List<EnrollmentStatus> validStatuses = List.of(
                EnrollmentStatus.ACTIVE,
                EnrollmentStatus.PENDING,
                EnrollmentStatus.RESERVED
        );

        // Lấy toàn bộ enrollment của khóa học, sau đó filter bằng Java Stream
        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdOrderByEnrolledAtAscIdAsc(courseId)
                .stream()
                .filter(e -> validStatuses.contains(e.getStatus()))
                .toList();

        if (enrollments.isEmpty()) {
            return Set.of();
        }

        Set<Long> studentIds = enrollments.stream()
                .map(Enrollment::getStudentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        return studentRepository.findAllById(studentIds).stream()
                .map(Student::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
