package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.course.SessionResponse;
import java.util.List;

public interface SessionService {
    List<SessionResponse> listByCourse(Long courseId);
    SessionResponse getById(Long id);
    SessionResponse addManual(Long courseId, SessionCreateRequest request);
    SessionResponse cancel(Long id, SessionCancelRequest request);
    SessionResponse assignTeacher(Long sessionId, Long teacherId);
    void delete(Long id);
}