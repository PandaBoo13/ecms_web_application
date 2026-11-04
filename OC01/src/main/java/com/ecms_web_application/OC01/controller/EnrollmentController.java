package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.enrollment.CreateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.CreateOfflineEnrollmentsRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.CompleteEnrollmentsRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.RecordFinalScoreRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReplaceSessionAbsencesRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.ReserveEnrollmentRequest;
import com.ecms_web_application.OC01.dto.request.enrollment.TerminateEnrollmentRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import com.ecms_web_application.OC01.service.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {
    private final EnrollmentService enrollmentService;

    @PostMapping("/offline")
    public ResponseEntity<RequestResponse> createOffline(@Valid @RequestBody CreateEnrollmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse(
                enrollmentService.createOffline(request.getInvoiceId()), "Tạo ghi danh OFFLINE thành công"));
    }

    @PostMapping("/offline/bulk")
    public ResponseEntity<RequestResponse> createOfflineBatch(
            @Valid @RequestBody CreateOfflineEnrollmentsRequest request) {
        return ResponseEntity.ok(new RequestResponse(
                enrollmentService.createOfflineBatch(request.invoiceIds()),
                "Đã xử lý danh sách ghi danh OFFLINE"));
    }

    @PostMapping("/complete/bulk")
    public ResponseEntity<RequestResponse> completeBatch(
            @Valid @RequestBody CompleteEnrollmentsRequest request) {
        return ResponseEntity.ok(new RequestResponse(
                enrollmentService.completeBatch(request.courseId(), request.enrollmentIds()),
                "Đã xử lý xét hoàn thành học viên"));
    }

    @GetMapping("/offline/eligible")
    public ResponseEntity<RequestResponse> offlineCandidates(
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(new RequestResponse(
                enrollmentService.searchOfflineCandidates(courseId, search, pageable),
                "Lấy danh sách đủ điều kiện ghi danh OFFLINE thành công"));
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
                type, status, courseId, studentId, accountId, search,
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
                "Lấy lịch sử vắng mặt thành công"));
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
    public ResponseEntity<RequestResponse> complete(@PathVariable Long enrollmentId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.complete(enrollmentId),
                "Đánh dấu hoàn thành khóa học thành công"));
    }
}
