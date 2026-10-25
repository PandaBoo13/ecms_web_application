package com.ecms_web_application.OC01.controller;

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

    @PostMapping
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ResponseEntity<RequestResponse> create(
            @PathVariable Long courseId,
            @Valid @RequestBody QuizCreateRequest request) {
        QuizResponse data = quizService.createQuiz(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo quiz thành công"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody QuizCreateRequest request) {
        QuizResponse data = quizService.updateQuiz(courseId, id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật quiz thành công"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        quizService.deleteQuiz(courseId, id);
        return ResponseEntity.ok(new RequestResponse("Xóa quiz thành công"));
    }

    // ===== READ (mọi user đã login) =====

    @GetMapping
    public ResponseEntity<RequestResponse> list(@PathVariable Long courseId) {
        List<QuizResponse> data = quizService.listQuizzes(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách quiz thành công"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getDetail(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        QuizDetailResponse data = quizService.getQuizDetail(courseId, id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy quiz thành công"));
    }

    // ===== ATTEMPT (HV làm bài) =====

    @PostMapping("/{id}/start")
    public ResponseEntity<RequestResponse> start(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        QuizAttemptResponse data = quizService.startAttempt(courseId, id);
        return ResponseEntity.ok(new RequestResponse(data, "Bắt đầu làm quiz"));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<RequestResponse> submit(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody QuizSubmitRequest request) {
        QuizAttemptResponse data = quizService.submitAttempt(courseId, id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Nộp bài thành công"));
    }

    @GetMapping("/{id}/attempts")
    public ResponseEntity<RequestResponse> attempts(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        List<QuizAttemptResponse> data = quizService.getMyAttempts(courseId, id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy lịch sử làm bài thành công"));
    }

    @GetMapping("/{id}/attempts/{attemptId}")
    public ResponseEntity<RequestResponse> attemptDetail(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @PathVariable Long attemptId) {
        QuizAttemptResponse data = quizService.getAttemptDetail(courseId, id, attemptId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chi tiết attempt thành công"));
    }
}