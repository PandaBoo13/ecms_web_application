package com.ecms_web_application.OC01.controller.course;

import com.ecms_web_application.OC01.dto.request.course.QuizCreateRequest;
import com.ecms_web_application.OC01.dto.request.course.QuizSubmitRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.QuizAttemptResponse;
import com.ecms_web_application.OC01.dto.response.course.QuizDetailResponse;
import com.ecms_web_application.OC01.dto.response.course.QuizResponse;
import com.ecms_web_application.OC01.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses/{courseId}/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    // ===== CRUD (GV/Admin) =====

    /**
     * API: Tạo bài kiểm tra (Quiz) mới
     * Method: POST /api/courses/{courseId}/quizzes
     * Chức năng: Giảng viên tạo bài kiểm tra trắc nghiệm (cấu hình số câu, thời gian, điểm đạt).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ResponseEntity<RequestResponse> create(
            @PathVariable Long courseId,
            @Valid @RequestBody QuizCreateRequest request) {
        QuizResponse data = quizService.createQuiz(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo quiz thành công"));
    }

    /**
     * API: Cập nhật bài kiểm tra
     * Method: PUT /api/courses/{courseId}/quizzes/{id}
     * Chức năng: Sửa cấu hình của Quiz (VD: tăng thời gian làm bài lên 15 phút).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody QuizCreateRequest request) {
        QuizResponse data = quizService.updateQuiz(courseId, id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật quiz thành công"));
    }

    /**
     * API: Xóa bài kiểm tra
     * Method: DELETE /api/courses/{courseId}/quizzes/{id}
     * Chức năng: Xóa Quiz khỏi khóa học.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        quizService.deleteQuiz(courseId, id);
        return ResponseEntity.ok(new RequestResponse("Xóa quiz thành công"));
    }

    // ===== READ (mọi user đã login) =====

    /**
     * API: Lấy danh sách Quiz của khóa
     * Method: GET /api/courses/{courseId}/quizzes
     * Chức năng: Hiển thị danh sách các bài kiểm tra có trong khóa học.
     */
    @GetMapping
    public ResponseEntity<RequestResponse> list(@PathVariable Long courseId) {
        List<QuizResponse> data = quizService.listQuizzes(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách quiz thành công"));
    }

    /**
     * API: Lấy chi tiết Quiz (kèm câu hỏi)
     * Method: GET /api/courses/{courseId}/quizzes/{id}
     * Chức năng: Xem trước nội dung bài kiểm tra (đối với học viên, đáp án sẽ bị ẩn).
     */
    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getDetail(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        QuizDetailResponse data = quizService.getQuizDetail(courseId, id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy quiz thành công"));
    }

    // ===== ATTEMPT (HV làm bài) =====

    /**
     * API: Bắt đầu làm bài kiểm tra
     * Method: POST /api/courses/{courseId}/quizzes/{id}/start
     * Chức năng: Khởi tạo một lượt làm bài mới (Attempt), trả về danh sách câu hỏi và bắt đầu tính giờ.
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<RequestResponse> start(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        QuizAttemptResponse data = quizService.startAttempt(courseId, id);
        return ResponseEntity.ok(new RequestResponse(data, "Bắt đầu làm quiz"));
    }

    /**
     * API: Nộp bài kiểm tra
     * Method: POST /api/courses/{courseId}/quizzes/{id}/submit
     * Chức năng: Học viên nộp đáp án. Hệ thống tự động chấm điểm và lưu lịch sử.
     */
    @PostMapping("/{id}/submit")
    public ResponseEntity<RequestResponse> submit(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody QuizSubmitRequest request) {
        QuizAttemptResponse data = quizService.submitAttempt(courseId, id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Nộp bài thành công"));
    }

    /**
     * API: Lấy lịch sử làm bài của tôi
     * Method: GET /api/courses/{courseId}/quizzes/{id}/attempts
     * Chức năng: Xem lại danh sách các lần làm bài (điểm số, thời gian, trạng thái Pass/Fail).
     */
    @GetMapping("/{id}/attempts")
    public ResponseEntity<RequestResponse> attempts(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        List<QuizAttemptResponse> data = quizService.getMyAttempts(courseId, id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy lịch sử làm bài thành công"));
    }

    /**
     * API: Xem chi tiết một lần làm bài
     * Method: GET /api/courses/{courseId}/quizzes/{id}/attempts/{attemptId}
     * Chức năng: Xem lại đáp án đã chọn, đáp án đúng và giải thích (nếu bài thi cho phép xem lại).
     */
    @GetMapping("/{id}/attempts/{attemptId}")
    public ResponseEntity<RequestResponse> attemptDetail(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @PathVariable Long attemptId) {
        QuizAttemptResponse data = quizService.getAttemptDetail(courseId, id, attemptId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chi tiết attempt thành công"));
    }
}