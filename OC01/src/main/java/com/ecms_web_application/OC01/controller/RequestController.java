package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestSearchRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.request.RequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Request API — 1 controller cho TẤT CẢ loại yêu cầu.
 *
 *   POST /api/requests                          → tạo yêu cầu
 *   GET  /api/requests                          → search
 *   GET  /api/requests/{id}                     → chi tiết
 *   GET  /api/requests/{id}/course-conflicts    → preview conflict (COURSE_REVIEW)
 *   POST /api/requests/{id}/review              → duyệt / từ chối
 *   POST /api/requests/{id}/cancel              → requester tự hủy
 */
@Slf4j
@RestController
@RequestMapping("/api/requests")
@RequiredArgsConstructor
public class RequestController {

    private final RequestService requestService;

    // ============================================================
    // CREATE
    // ============================================================
    @PostMapping
    public ResponseEntity<RequestResponse> create(
            @Valid @RequestBody RequestCreateRequest req) {
        var data = requestService.create(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo yêu cầu thành công"));
    }

    // ============================================================
    // SEARCH
    // ============================================================
    @GetMapping
    public ResponseEntity<RequestResponse> search(
            @ModelAttribute RequestSearchRequest filter) {

        Sort sort = "ASC".equalsIgnoreCase(filter.getSortDirection())
                ? Sort.by(filter.getSortBy()).ascending()
                : Sort.by(filter.getSortBy()).descending();

        int safeSize = Math.max(1, Math.min(filter.getSize(), 100));
        Pageable pageable = PageRequest.of(Math.max(0, filter.getPage()), safeSize, sort);

        Page<?> data = requestService.search(filter, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách yêu cầu thành công"));
    }

    // ============================================================
    // GET BY ID
    // ============================================================
    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        var data = requestService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy yêu cầu thành công"));
    }

    // ============================================================
    // PREVIEW COURSE CONFLICTS — cảnh báo trùng lịch trước khi duyệt
    // ============================================================
    @GetMapping("/{id}/course-conflicts")
    public ResponseEntity<RequestResponse> previewCourseConflicts(@PathVariable Long id) {
        var data = requestService.previewCourseConflicts(id);
        String msg = data.isHasConflicts()
                ? "Phát hiện " + data.getConflictCount() + " khóa học trùng lịch"
                : "Không phát hiện conflict";
        return ResponseEntity.ok(new RequestResponse(data, msg));
    }

    // ============================================================
    // REVIEW
    // ============================================================
    @PostMapping("/{id}/review")
    public ResponseEntity<RequestResponse> review(
            @PathVariable Long id,
            @Valid @RequestBody RequestReviewRequest req) {
        var data = requestService.review(id, req);
        String msg = Boolean.TRUE.equals(req.getApproved())
                ? "Đã duyệt yêu cầu"
                : "Đã từ chối yêu cầu";
        return ResponseEntity.ok(new RequestResponse(data, msg));
    }

    // ============================================================
    // CANCEL
    // ============================================================
    @PostMapping("/{id}/cancel")
    public ResponseEntity<RequestResponse> cancel(@PathVariable Long id) {
        var data = requestService.cancel(id);
        return ResponseEntity.ok(new RequestResponse(data, "Đã hủy yêu cầu"));
    }
}