package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.SessionResponse;
import java.util.List;

public interface SessionService {
    List<SessionResponse> listByCourse(Long courseId);
    SessionResponse getById(Long courseId, Long id);
    SessionResponse addManual(Long courseId, SessionCreateRequest request);
    SessionResponse cancel(Long id, SessionCancelRequest request);

    /** FR_CRS_009: gán/gỡ GV dạy thay cho 1 buổi. Không đụng session.teacher_id. */
    SessionResponse assignSubstituteTeacher(Long sessionId, Long substituteTeacherId);

    /** FR_CRS_009C: gán/gỡ trợ giảng cho 1 buổi. */
    SessionResponse assignAssistant(Long sessionId, Long assistantId);

    /** FR_CRS_009B: đổi GV chính của khóa + sync session SCHEDULED chưa có dạy thay. */
    void changeCourseMainTeacher(Long courseId, Long newTeacherId);

    /** FR_CRS_006: sinh session tự động từ start_date..end_date theo schedule_days. */
    com.ecms_web_application.OC01.dto.response.course.SessionGenerationResult generateSessions(Long courseId);

    /** Đánh dấu session DONE + trigger recalc Offline progress. */
    SessionResponse markDone(Long sessionId);

    void delete(Long id);
}