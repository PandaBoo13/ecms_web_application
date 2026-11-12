package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.response.enrollment.PendingEnrollmentBatchResponse;
import com.ecms_web_application.OC01.dto.request.enrollment.SaveSessionAttendanceRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceRecordResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentStatusLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.PendingEnrollmentCandidateResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentSummaryResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentBatchActionResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.SessionAttendanceResponse;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EnrollmentService {
    EnrollmentResponse createOffline(Long invoiceId);
    EnrollmentResponse createOfflineAfterPayment(Long invoiceId);
    /** Ghi danh lại các hóa đơn PAID chưa có ghi danh (cả khóa ONLINE và OFFLINE). */
    PendingEnrollmentBatchResponse createPendingBatch(List<Long> invoiceIds);
    EnrollmentBatchActionResponse completeBatch(Long courseId, List<Long> enrollmentIds);
    EnrollmentResponse createOnlineFromPaidInvoice(Long invoiceId);
    Page<PendingEnrollmentCandidateResponse> searchPendingCandidates(
            Long courseId, CourseType courseType, String search, Pageable pageable);
    Page<EnrollmentResponse> search(EnrollmentType type, EnrollmentStatus status, Long courseId,
                                    Long studentId, Long accountId, String search,
                                    boolean includeCompletionEligibility, Pageable pageable);
    EnrollmentSummaryResponse getSummary();
    EnrollmentResponse getById(Long enrollmentId);
    EnrollmentResponse reserve(Long enrollmentId, ReserveEnrollmentRequest request);
    EnrollmentResponse resume(Long enrollmentId);
    EnrollmentResponse terminate(Long enrollmentId, TerminateEnrollmentRequest request);
    /**
     * Chấm dứt ghi danh gắn với hóa đơn khi hoàn tiền toàn phần đã hoàn tất.
     * Không làm gì nếu chưa có ghi danh hoặc ghi danh đã TERMINATED/COMPLETED.
     */
    void terminateForFullRefund(Long invoiceId, Long actorId, String reason);
    EnrollmentResponse recordFinalScore(Long enrollmentId, RecordFinalScoreRequest request);
    EnrollmentResponse complete(Long enrollmentId);
    SessionAttendanceResponse getSessionAttendance(Long courseId, Long sessionId);
    SessionAttendanceResponse saveSessionAttendance(
            Long courseId, Long sessionId, SaveSessionAttendanceRequest request);
    List<AttendanceRecordResponse> getAttendanceHistory(Long enrollmentId);
    List<EnrollmentStatusLogResponse> getStatusHistory(Long enrollmentId);
}
