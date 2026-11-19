package com.ecms_web_application.OC01.controller.course;

import com.ecms_web_application.OC01.dto.request.course.ProgressUpdateRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.ProgressResponse;
import com.ecms_web_application.OC01.service.ProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
@Slf4j
public class ProgressController {

    private final ProgressService progressService;

    /**
     * API: Lấy danh sách tiến độ các khóa học của tôi
     * Method: GET /api/progress/my-courses
     * Chức năng: Học viên xem mình đã học được bao nhiêu % ở từng khóa (hiển thị dạng thẻ trên dashboard).
     */
    @GetMapping("/my-courses")
    public ResponseEntity<RequestResponse> getMyCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "lastAccessedAt"));
        Page<ProgressResponse> data = progressService.getMyCourses(pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tiến độ các khóa thành công"));
    }

    /**
     * API: Lấy tiến độ tổng thể của tôi trong 1 khóa học
     * Method: GET /api/progress/courses/{courseId}
     * Chức năng: Xem % hoàn thành của toàn bộ khóa học (thanh tiến độ ở đầu trang).
     */
    @GetMapping("/courses/{courseId}")
    public ResponseEntity<RequestResponse> getMyProgressInCourse(@PathVariable Long courseId) {
        ProgressResponse data = progressService.getMyProgressInCourse(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tiến độ khóa thành công"));
    }

    /**
     * API: Lấy tiến độ chi tiết từng bài học
     * Method: GET /api/progress/courses/{courseId}/resources
     * Chức năng: Xem trạng thái (chưa học, đang học, hoàn thành) của từng Chapter/Lesson/Quiz trong khóa.
     */
    @GetMapping("/courses/{courseId}/resources")
    public ResponseEntity<RequestResponse> getResourceProgresses(@PathVariable Long courseId) {
        List<ProgressResponse> data = progressService.getResourceProgresses(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tiến độ resource thành công"));
    }

    /**
     * API: Cập nhật tiến độ bài học
     * Method: PATCH /api/progress/resources/{resourceId}
     * Chức năng: Học viên xem video/bài giảng được bao nhiêu % thì gọi API này để lưu lại (VD: xem được 50%).
     */
    @PatchMapping("/resources/{resourceId}")
    public ResponseEntity<RequestResponse> updateResourceProgress(
            @PathVariable Long resourceId,
            @Valid @RequestBody ProgressUpdateRequest request) {
        ProgressResponse data = progressService.updateResourceProgress(
                resourceId, request.getPercentage(), request.getTimeSpentSeconds());
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật tiến độ thành công"));
    }

    /**
     * API: Đánh dấu hoàn thành bài học
     * Method: POST /api/progress/resources/{resourceId}/complete
     * Chức năng: Học viên bấm "Đánh dấu đã học xong" (tự động gán tiến độ = 100%).
     */
    @PostMapping("/resources/{resourceId}/complete")
    public ResponseEntity<RequestResponse> markCompleted(@PathVariable Long resourceId) {
        ProgressResponse data = progressService.markResourceCompleted(resourceId);
        return ResponseEntity.ok(new RequestResponse(data, "Đánh dấu hoàn thành thành công"));
    }
}