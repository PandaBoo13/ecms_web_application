package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.ProgressResponse;
import com.ecms_web_application.OC01.service.ProgressService;
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

    @GetMapping("/my-courses")
    public ResponseEntity<RequestResponse> getMyCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "lastAccessedAt"));
        Page<ProgressResponse> data = progressService.getMyCourses(pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tiến độ các khóa thành công"));
    }

    @GetMapping("/courses/{courseId}")
    public ResponseEntity<RequestResponse> getMyProgressInCourse(@PathVariable Long courseId) {
        ProgressResponse data = progressService.getMyProgressInCourse(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tiến độ khóa thành công"));
    }

    @GetMapping("/courses/{courseId}/resources")
    public ResponseEntity<RequestResponse> getResourceProgresses(@PathVariable Long courseId) {
        List<ProgressResponse> data = progressService.getResourceProgresses(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy tiến độ resource thành công"));
    }

    @PatchMapping("/resources/{resourceId}")
    public ResponseEntity<RequestResponse> updateResourceProgress(
            @PathVariable Long resourceId,
            @RequestParam(required = false) Integer percentage,
            @RequestParam(required = false) Long timeSpentSeconds) {
        ProgressResponse data = progressService.updateResourceProgress(
                resourceId, percentage, timeSpentSeconds);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật tiến độ thành công"));
    }

    @PostMapping("/resources/{resourceId}/complete")
    public ResponseEntity<RequestResponse> markCompleted(@PathVariable Long resourceId) {
        ProgressResponse data = progressService.markResourceCompleted(resourceId);
        return ResponseEntity.ok(new RequestResponse(data, "Đánh dấu hoàn thành thành công"));
    }
}