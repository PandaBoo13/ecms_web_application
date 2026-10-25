package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.course.*;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.CourseDetailResponse;
import com.ecms_web_application.OC01.dto.response.course.CourseResponse;
import com.ecms_web_application.OC01.service.CourseService;
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
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Slf4j
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<RequestResponse> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        Sort sort = "asc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<CourseResponse> data = courseService.search(status, type, teacherId, categoryId, search, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách khóa học thành công"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        CourseDetailResponse data = courseService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy khóa học thành công"));
    }

    @PostMapping
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody CourseCreateRequest request) {
        CourseResponse data = courseService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo khóa học thành công"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CourseUpdateRequest request) {
        CourseResponse data = courseService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật thành công"));
    }

    @PutMapping("/{id}/offline-info")
    public ResponseEntity<RequestResponse> updateOfflineInfo(
            @PathVariable Long id,
            @Valid @RequestBody CourseOfflineInfoRequest request) {
        CourseResponse data = courseService.updateOfflineInfo(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật thông tin lớp Offline thành công"));
    }

    @PostMapping("/{id}/submit-review")
    public ResponseEntity<RequestResponse> submitForReview(@PathVariable Long id) {
        CourseResponse data = courseService.submitForReview(id);
        return ResponseEntity.ok(new RequestResponse(data, "Đã gửi duyệt"));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<RequestResponse> review(
            @PathVariable Long id,
            @Valid @RequestBody CourseReviewRequest request) {
        CourseResponse data = courseService.review(id, request);
        String msg = Boolean.TRUE.equals(request.getApproved())
                ? "Đã phê duyệt khóa học" : "Đã từ chối khóa học";
        return ResponseEntity.ok(new RequestResponse(data, msg));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<RequestResponse> archive(@PathVariable Long id) {
        CourseResponse data = courseService.archive(id);
        return ResponseEntity.ok(new RequestResponse(data, "Đã lưu trữ khóa học"));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<RequestResponse> cancel(
            @PathVariable Long id,
            @RequestParam String reason) {
        CourseResponse data = courseService.cancel(id, reason);
        return ResponseEntity.ok(new RequestResponse(data, "Đã hủy khóa học"));
    }

    @PostMapping("/{sourceId}/copy")
    public ResponseEntity<RequestResponse> copy(
            @PathVariable Long sourceId,
            @Valid @RequestBody CourseCopyRequest request) {
        CourseDetailResponse data = courseService.copy(sourceId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Copy khóa học thành công"));
    }

    /** FR_CRS_009B: đổi GV chính của khóa. Chỉ ADMIN. */
    @PatchMapping("/{id}/teacher")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RequestResponse> changeTeacher(
            @PathVariable Long id,
            @RequestParam Long teacherId) {
        CourseResponse data = courseService.changeTeacher(id, teacherId);
        return ResponseEntity.ok(new RequestResponse(data, "Đã đổi GV chính của khóa"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> softDelete(@PathVariable Long id) {
        courseService.softDelete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa mềm khóa học thành công"));
    }

    @DeleteMapping("/{id}/hard")
    public ResponseEntity<RequestResponse> hardDelete(@PathVariable Long id) {
        courseService.hardDelete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa cứng khóa học thành công"));
    }
}