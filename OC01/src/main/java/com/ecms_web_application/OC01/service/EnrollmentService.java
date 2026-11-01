package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReplaceSessionAbsencesRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceAbsenceResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentStatusLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.SessionAttendanceResponse;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EnrollmentService {
    EnrollmentResponse createOffline(Long invoiceId);
    EnrollmentResponse createOnlineFromPaidInvoice(Long invoiceId);
    Page<EnrollmentResponse> search(EnrollmentType type, EnrollmentStatus status, Long courseId,
                                    Long studentId, Long accountId, Pageable pageable);
    EnrollmentResponse getById(Long enrollmentId);
    EnrollmentResponse reserve(Long enrollmentId, ReserveEnrollmentRequest request);
    EnrollmentResponse resume(Long enrollmentId);
    EnrollmentResponse terminate(Long enrollmentId, TerminateEnrollmentRequest request);
    EnrollmentResponse recordFinalScore(Long enrollmentId, RecordFinalScoreRequest request);
    EnrollmentResponse complete(Long enrollmentId);
    SessionAttendanceResponse getSessionAttendance(Long courseId, Long sessionId);
    List<AttendanceAbsenceResponse> replaceSessionAbsences(
            Long courseId, Long sessionId, ReplaceSessionAbsencesRequest request);
    List<AttendanceAbsenceResponse> getAttendanceHistory(Long enrollmentId);
    List<EnrollmentStatusLogResponse> getStatusHistory(Long enrollmentId);
}
