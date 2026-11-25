package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.enrollment.CompleteEnrollmentsRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.CompleteEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReopenCompletionRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReopenGradeSheetRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import com.ecms_web_application.OC01.entity.enums.CompletionResult;
import com.ecms_web_application.OC01.service.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {
    private final EnrollmentService enrollmentService;

    @PostMapping("/complete/bulk")
    public ResponseEntity<RequestResponse> completeBatch(
            @Valid @RequestBody CompleteEnrollmentsRequest request) {
        return ResponseEntity.ok(new RequestResponse(
                enrollmentService.completeBatch(request.courseId(), request.enrollmentIds(), request.result()),
                "Đã xử lý xét hoàn thành học viên"));
    }

    @GetMapping("/course/{courseId}/roster/export")
    public ResponseEntity<byte[]> exportCourseRoster(@PathVariable Long courseId) {
        byte[] file = enrollmentService.exportCourseRoster(courseId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=course-" + courseId + "-roster.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }

    @PostMapping(value = "/course/{courseId}/final-scores/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RequestResponse> importFinalScores(@PathVariable Long courseId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.importFinalScores(courseId, file),
                "Đã xử lý nhập điểm cuối khóa"));
    }

    @GetMapping("/course/{courseId}/grade-review-status")
    public ResponseEntity<RequestResponse> getGradeReviewStatus(@PathVariable Long courseId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.getGradeReviewStatus(courseId),
                "Lấy trạng thái duyệt bảng điểm thành công"));
    }

    @PostMapping("/course/{courseId}/grade-review/submit")
    public ResponseEntity<RequestResponse> submitGradeReview(@PathVariable Long courseId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.submitGradeReview(courseId),
                "Đã gửi yêu cầu phê duyệt bảng điểm"));
    }

    @PostMapping("/course/{courseId}/grade-review/reopen")
    public ResponseEntity<RequestResponse> reopenGradeSheet(@PathVariable Long courseId,
            @Valid @RequestBody ReopenGradeSheetRequest request) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.reopenGradeSheet(courseId, request),
                "Đã mở lại bảng điểm để chỉnh sửa"));
    }

    @GetMapping("/summary")
    public ResponseEntity<RequestResponse> summary() {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.getSummary(),
                "Lấy tổng quan ghi danh thành công"));
    }

    @GetMapping
    public ResponseEntity<RequestResponse> search(
            @RequestParam(required = false) EnrollmentType type,
            @RequestParam(required = false) EnrollmentStatus status,
            @RequestParam(required = false) CompletionResult completionResult,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean includeCompletionEligibility,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)),
                Sort.by(Sort.Direction.DESC, "enrolledAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok(new RequestResponse(enrollmentService.search(
                type, status, completionResult, courseId, studentId, accountId, search,
                includeCompletionEligibility, pageable), "Lấy danh sách ghi danh thành công"));
    }

    @GetMapping("/{enrollmentId}")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long enrollmentId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.getById(enrollmentId),
                "Lấy thông tin ghi danh thành công"));
    }

    @GetMapping("/{enrollmentId}/attendance")
    public ResponseEntity<RequestResponse> attendanceHistory(@PathVariable Long enrollmentId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.getAttendanceHistory(enrollmentId),
                "Lấy lịch sử điểm danh thành công"));
    }

    @GetMapping("/{enrollmentId}/status-history")
    public ResponseEntity<RequestResponse> statusHistory(@PathVariable Long enrollmentId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.getStatusHistory(enrollmentId),
                "Lấy lịch sử trạng thái ghi danh thành công"));
    }

    @PostMapping("/{enrollmentId}/reserve")
    public ResponseEntity<RequestResponse> reserve(@PathVariable Long enrollmentId,
            @Valid @RequestBody ReserveEnrollmentRequest request) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.reserve(enrollmentId, request),
                "Bảo lưu ghi danh thành công"));
    }

    @PostMapping("/{enrollmentId}/resume")
    public ResponseEntity<RequestResponse> resume(@PathVariable Long enrollmentId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.resume(enrollmentId),
                "Khôi phục ghi danh thành công"));
    }

    @PostMapping("/{enrollmentId}/terminate")
    public ResponseEntity<RequestResponse> terminate(@PathVariable Long enrollmentId,
            @Valid @RequestBody TerminateEnrollmentRequest request) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.terminate(enrollmentId, request),
                "Kết thúc ghi danh thành công"));
    }

    @PutMapping("/{enrollmentId}/final-score")
    public ResponseEntity<RequestResponse> recordFinalScore(@PathVariable Long enrollmentId,
            @Valid @RequestBody RecordFinalScoreRequest request) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.recordFinalScore(enrollmentId, request),
                "Lưu điểm cuối khóa thành công"));
    }

    @PostMapping("/{enrollmentId}/complete")
    public ResponseEntity<RequestResponse> complete(@PathVariable Long enrollmentId,
            @Valid @RequestBody CompleteEnrollmentRequest request) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.complete(enrollmentId, request),
                "Đánh dấu hoàn thành khóa học thành công"));
    }

    @PostMapping("/{enrollmentId}/reopen-completion")
    public ResponseEntity<RequestResponse> reopenCompletion(@PathVariable Long enrollmentId,
            @Valid @RequestBody ReopenCompletionRequest request) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.reopenCompletion(enrollmentId, request),
                "Đã hoàn tác xét hoàn thành khóa học"));
    }
}
