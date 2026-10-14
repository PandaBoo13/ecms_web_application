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
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.RoomRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.service.AuditLogService;
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

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> listByCourse(Long courseId) {
        return sessionRepository.findByCourse_IdOrderBySessionNumberAsc(courseId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResponse getById(Long id) { return toResponse(getOrThrow(id)); }

    @Override
    @Transactional
    public SessionResponse addManual(Long courseId, SessionCreateRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));

        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chỉ khóa OFFLINE mới có session");
        }
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "startTime phải < endTime");
        }

        Integer nextNum = sessionRepository.maxSessionNumber(courseId) + 1;

        Session s = new Session();
        s.setCourse(course);
        s.setSessionNumber(nextNum);
        s.setTitle(request.getTitle());
        s.setDescription(request.getDescription());
        s.setStartTime(request.getStartTime());
        s.setEndTime(request.getEndTime());
        s.setNote(request.getNote());
        if (request.getTeacherId() != null) {
            s.setTeacher(accountRepository.findById(request.getTeacherId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại")));
        }
        if (request.getAssistantId() != null) {
            s.setAssistant(accountRepository.findById(request.getAssistantId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Trợ giảng không tồn tại")));
        }
        if (request.getRoomId() != null) {
            s.setRoom(roomRepository.findById(request.getRoomId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Phòng không tồn tại")));
        }
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
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SessionResponse assignTeacher(Long sessionId, Long teacherId) {
        Session s = getOrThrow(sessionId);
        if (teacherId == null) {
            s.setTeacher(null);
        } else {
            Account t = accountRepository.findById(teacherId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "GV không tồn tại"));
            s.setTeacher(t);
        }
        Session saved = sessionRepository.save(s);
        auditLogService.log("ASSIGN_TEACHER", "SESSION", sessionId, "GV: " + teacherId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Session s = getOrThrow(id);
        sessionRepository.delete(s);
        auditLogService.log("DELETE", "SESSION", id, null);
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
        if (s.getTeacher() != null) {
            r.setTeacherId(s.getTeacher().getId());
            if (s.getTeacher().getUserProfile() != null) {
                r.setTeacherName(s.getTeacher().getUserProfile().getFullName());
            }
        }
        if (s.getAssistant() != null) {
            r.setAssistantId(s.getAssistant().getId());
            if (s.getAssistant().getUserProfile() != null) {
                r.setAssistantName(s.getAssistant().getUserProfile().getFullName());
            }
        }
        if (s.getRoom() != null) {
            r.setRoomId(s.getRoom().getId());
            r.setRoomName(s.getRoom().getName());
        }
        r.setStatus(s.getStatus() != null ? s.getStatus().name() : null);
        r.setCancelReason(s.getCancelReason());
        r.setNote(s.getNote());
        r.setRescheduledFromId(s.getRescheduledFromId());
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }
}