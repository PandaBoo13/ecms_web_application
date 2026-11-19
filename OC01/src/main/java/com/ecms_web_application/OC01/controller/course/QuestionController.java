package com.ecms_web_application.OC01.controller.course;

import com.ecms_web_application.OC01.dto.request.course.QuestionCreateRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.QuestionResponse;
import com.ecms_web_application.OC01.service.QuestionService;
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

@RestController
@RequestMapping("/api/courses/{courseId}/questions")
@RequiredArgsConstructor
@Slf4j
public class QuestionController {

    private final QuestionService questionService;

    /**
     * API: Tìm kiếm và phân trang danh sách câu hỏi
     * Method: GET /api/courses/{courseId}/questions
     * Chức năng: Lấy ngân hàng câu hỏi của khóa, lọc theo Bài học, Dạng câu hỏi, Trạng thái, Hashtag.
     */
    @GetMapping
    public ResponseEntity<RequestResponse> search(
            @PathVariable Long courseId,
            @RequestParam(required = false) Long lessonId,
            @RequestParam(required = false) String questionType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String hashtag,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("orderIndex").ascending());
        Page<QuestionResponse> data = questionService.search(
                courseId, lessonId, questionType, status, hashtag, search, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách câu hỏi thành công"));
    }

    /**
     * API: Lấy chi tiết một câu hỏi
     * Method: GET /api/courses/{courseId}/questions/{id}
     * Chức năng: Xem nội dung, đáp án, giải thích của một câu hỏi cụ thể.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(
            @PathVariable Long courseId, @PathVariable Long id) {
        QuestionResponse data = questionService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy câu hỏi thành công"));
    }

    /**
     * API: Tạo câu hỏi mới
     * Method: POST /api/courses/{courseId}/questions
     * Chức năng: Giảng viên/Admin thêm câu hỏi vào ngân hàng (bắt buộc phải thuộc 1 Lesson).
     */
    @PostMapping
    public ResponseEntity<RequestResponse> create(
            @PathVariable Long courseId,
            @Valid @RequestBody QuestionCreateRequest request) {
        QuestionResponse data = questionService.create(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo câu hỏi thành công"));
    }

    /**
     * API: Cập nhật câu hỏi
     * Method: PUT /api/courses/{courseId}/questions/{id}
     * Chức năng: Sửa nội dung, đáp án đúng, hoặc di chuyển câu hỏi sang Lesson khác.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody QuestionCreateRequest request) {
        QuestionResponse data = questionService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật câu hỏi thành công"));
    }

    /**
     * API: Xóa câu hỏi
     * Method: DELETE /api/courses/{courseId}/questions/{id}
     * Chức năng: Xóa câu hỏi khỏi ngân hàng.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId, @PathVariable Long id) {
        questionService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa câu hỏi thành công"));
    }
}