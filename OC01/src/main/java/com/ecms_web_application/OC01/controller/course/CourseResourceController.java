package com.ecms_web_application.OC01.controller.course;

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

    /**
     * API: Lấy cây nội dung (Chapter/Lesson) của khóa học
     * Method: GET /api/courses/{courseId}/resources/tree
     * Chức năng: Trả về danh sách tài nguyên dạng cây phân cấp (đệ quy) để hiển thị sidebar.
     */
    @GetMapping("/tree")
    public ResponseEntity<RequestResponse> getTree(@PathVariable Long courseId) {
        List<ResourceTreeResponse> data = resourceService.getTreeByCourse(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy cây nội dung thành công"));
    }

    /**
     * API: Lấy chi tiết một tài nguyên
     * Method: GET /api/courses/{courseId}/resources/{id}
     * Chức năng: Xem thông tin chi tiết của 1 Chapter, Lesson, Video, Quiz, v.v.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(
            @PathVariable Long courseId, @PathVariable Long id) {
        CourseResourceResponse data = resourceService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy resource thành công"));
    }

    /**
     * API: Tạo tài nguyên mới
     * Method: POST /api/courses/{courseId}/resources
     * Chức năng: Thêm Chapter, Lesson hoặc các file media (Video, PDF) vào khóa học. (Chỉ khóa DRAFT mới được thêm).
     */
    @PostMapping
    public ResponseEntity<RequestResponse> create(
            @PathVariable Long courseId,
            @Valid @RequestBody ResourceCreateRequest request) {
        CourseResourceResponse data = resourceService.create(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo resource thành công"));
    }

    /**
     * API: Cập nhật tài nguyên
     * Method: PUT /api/courses/{courseId}/resources/{id}
     * Chức năng: Sửa tiêu đề, nội dung, link file, cấu hình quiz... của tài nguyên.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody ResourceUpdateRequest request) {
        CourseResourceResponse data = resourceService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật resource thành công"));
    }

    /**
     * API: Xóa tài nguyên
     * Method: DELETE /api/courses/{courseId}/resources/{id}
     * Chức năng: Xóa tài nguyên khỏi khóa học (không thể xóa nếu đang có tài nguyên con bên trong).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId, @PathVariable Long id) {
        resourceService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa resource thành công"));
    }

    /**
     * API: Sắp xếp lại thứ tự tài nguyên
     * Method: PUT /api/courses/{courseId}/resources/reorder
     * Chức năng: Kéo thả đổi thứ tự hiển thị của các Chapter/Lesson trong khóa học.
     */
    @PutMapping("/reorder")
    public ResponseEntity<RequestResponse> reorder(
            @PathVariable Long courseId,
            @jakarta.validation.Valid @RequestBody com.ecms_web_application.OC01.dto.request.course.ResourceReorderRequest request) {
        resourceService.reorder(courseId, request);
        return ResponseEntity.ok(new RequestResponse("Cập nhật thứ tự thành công"));
    }
}