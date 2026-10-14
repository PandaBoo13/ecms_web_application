package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.course.ResourceCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.ResourceUpdateRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.CourseResourceResponse;
import com.ecms_web_application.OC01.dto.response.course.ResourceTreeResponse;
import com.ecms_web_application.OC01.service.CourseResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses/{courseId}/resources")
@RequiredArgsConstructor
@Slf4j
public class CourseResourceController {

    private final CourseResourceService resourceService;

    @GetMapping("/tree")
    public ResponseEntity<RequestResponse> getTree(@PathVariable Long courseId) {
        List<ResourceTreeResponse> data = resourceService.getTreeByCourse(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy cây nội dung thành công"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(
            @PathVariable Long courseId, @PathVariable Long id) {
        CourseResourceResponse data = resourceService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy resource thành công"));
    }

    @PostMapping
    public ResponseEntity<RequestResponse> create(
            @PathVariable Long courseId,
            @Valid @RequestBody ResourceCreateRequest request) {
        CourseResourceResponse data = resourceService.create(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo resource thành công"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody ResourceUpdateRequest request) {
        CourseResourceResponse data = resourceService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật resource thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId, @PathVariable Long id) {
        resourceService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa resource thành công"));
    }
}