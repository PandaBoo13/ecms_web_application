package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.SessionResponse;
import com.ecms_web_application.OC01.dto.response.course.SessionScheduleResponse;

import java.time.LocalDate;
import java.util.List;

public interface SessionService {
    List<SessionResponse> listByCourse(Long courseId);
    SessionResponse getById(Long courseId, Long id);
    SessionResponse addManual(Long courseId, SessionCreateRequest request);
    SessionResponse cancel(Long id, SessionCancelRequest request);

    SessionResponse assignSubstituteTeacher(Long sessionId, Long substituteTeacherId);

    SessionResponse assignAssistant(Long sessionId, Long assistantId);

    void changeCourseMainTeacher(Long courseId, Long newTeacherId);

    com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult generateSessions(Long courseId);

    SessionResponse markDone(Long sessionId);

    void delete(Long id);

    // ============================================================
    // [M1] INSTRUCTOR — lịch giảng dạy cá nhân
    // ============================================================
    List<SessionScheduleResponse> getMyInstructorSchedule(Long teacherId, LocalDate from, LocalDate to);

    // ============================================================
    // [M2] STUDENT — lịch học cá nhân
    // ============================================================
    List<SessionScheduleResponse> getMyStudentSchedule(Long accountId, LocalDate from, LocalDate to);
}