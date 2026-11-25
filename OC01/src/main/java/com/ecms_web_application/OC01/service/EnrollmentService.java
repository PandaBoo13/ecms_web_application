package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.CompleteEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReopenCompletionRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReopenGradeSheetRequest;
import com.ecms_web_application.OC01.dto.response.enrollment.GradeReviewStatusResponse;
import com.ecms_web_application.OC01.dto.request.enrollment.SaveSessionAttendanceRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceAuditLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceMatrixResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.AttendanceRecordResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentStatusLogResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentSummaryResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.EnrollmentBatchActionResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.FinalScoreImportResponse;
import com.ecms_web_application.OC01.dto.response.enrollment.SessionAttendanceResponse;
import com.ecms_web_application.OC01.entity.enums.CompletionResult;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import com.ecms_web_application.OC01.entity.enums.CompletionResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface EnrollmentService {
    EnrollmentResponse createOfflineAfterPayment(Long invoiceId);
    EnrollmentBatchActionResponse completeBatch(Long courseId, List<Long> enrollmentIds, CompletionResult result);
    byte[] exportCourseRoster(Long courseId);
    FinalScoreImportResponse importFinalScores(Long courseId, MultipartFile file);
    EnrollmentResponse createOnlineFromPaidInvoice(Long invoiceId);
    Page<EnrollmentResponse> search(EnrollmentType type, EnrollmentStatus status, CompletionResult completionResult, Long courseId,
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
    EnrollmentResponse complete(Long enrollmentId, CompleteEnrollmentRequest request);
    /** Hoàn tác xét hoàn thành sai: đưa ghi danh COMPLETED về ACTIVE để xét lại. */
    EnrollmentResponse reopenCompletion(Long enrollmentId, ReopenCompletionRequest request);
    SessionAttendanceResponse getSessionAttendance(Long courseId, Long sessionId);
    SessionAttendanceResponse saveSessionAttendance(
            Long courseId, Long sessionId, SaveSessionAttendanceRequest request);
    /** Ma trận điểm danh học viên × buổi của khóa OFFLINE. */
    AttendanceMatrixResponse getCourseAttendanceMatrix(Long courseId);
    /** Xuất ma trận điểm danh của khóa OFFLINE ra Excel. */
    byte[] exportCourseAttendance(Long courseId);
    /** Lịch sử thay đổi điểm danh của một buổi. */
    List<AttendanceAuditLogResponse> getSessionAttendanceHistory(Long courseId, Long sessionId);
    List<AttendanceRecordResponse> getAttendanceHistory(Long enrollmentId);
    List<EnrollmentStatusLogResponse> getStatusHistory(Long enrollmentId);
    GradeReviewStatusResponse getGradeReviewStatus(Long courseId);
    GradeReviewStatusResponse submitGradeReview(Long courseId);
    /** ADMIN mở khóa bảng điểm đã duyệt để giảng viên sửa điểm/điểm danh và gửi duyệt lại. */
    GradeReviewStatusResponse reopenGradeSheet(Long courseId, ReopenGradeSheetRequest request);
}
