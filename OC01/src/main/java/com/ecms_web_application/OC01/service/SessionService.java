package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.SessionBulkDeleteResult; // 🆕 Bổ sung import
import com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult;
import com.ecms_web_application.OC01.dto.response.course.SessionResponse;
import com.ecms_web_application.OC01.dto.response.course.SessionScheduleResponse;

import java.time.LocalDate;
import java.util.List;

public interface SessionService {

    // ============================================================
    // CRUD CƠ BẢN
    // ============================================================
    List<SessionResponse> listByCourse(Long courseId);
    SessionResponse getById(Long courseId, Long id);
    SessionResponse addManual(Long courseId, SessionCreateRequest request);

    // ============================================================
    // TRẠNG THÁI & PHÂN CÔNG
    // ============================================================
    SessionResponse cancel(Long id, SessionCancelRequest request);
    SessionResponse markDone(Long sessionId);

    SessionResponse assignSubstituteTeacher(Long sessionId, Long substituteTeacherId);
    SessionResponse assignAssistant(Long sessionId, Long assistantId);
    void changeCourseMainTeacher(Long courseId, Long newTeacherId);

    // ============================================================
    // SINH & XÓA
    // ============================================================
    SessionGenerationResult generateSessions(Long courseId);
    void delete(Long id);

    // 🆕 Xóa hàng loạt
    SessionBulkDeleteResult bulkDelete(Long courseId, List<Long> sessionIds);

    // ============================================================
    // [M1] INSTRUCTOR — lịch giảng dạy cá nhân
    // ============================================================
    List<SessionScheduleResponse> getMyInstructorSchedule(Long teacherId, LocalDate from, LocalDate to);

    // ============================================================
    // [M2] STUDENT — lịch học cá nhân
    // ============================================================
    List<SessionScheduleResponse> getMyStudentSchedule(Long accountId, LocalDate from, LocalDate to);
}