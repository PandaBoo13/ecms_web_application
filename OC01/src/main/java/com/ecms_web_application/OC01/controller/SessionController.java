package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.course.SessionCancelRequest;
import com.ecms_web_application.OC01.dto.request.course.SessionCreateRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.SessionResponse;
import com.ecms_web_application.OC01.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses/{courseId}/sessions")
@RequiredArgsConstructor
@Slf4j
public class SessionController {

    private final SessionService sessionService;

    @GetMapping
    public ResponseEntity<RequestResponse> list(@PathVariable Long courseId) {
        List<SessionResponse> data = sessionService.listByCourse(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách session thành công"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(
            @PathVariable Long courseId, @PathVariable Long id) {
        SessionResponse data = sessionService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy session thành công"));
    }

    @PostMapping
    public ResponseEntity<RequestResponse> add(
            @PathVariable Long courseId,
            @Valid @RequestBody SessionCreateRequest request) {
        SessionResponse data = sessionService.addManual(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Thêm session thành công"));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<RequestResponse> cancel(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody SessionCancelRequest request) {
        SessionResponse data = sessionService.cancel(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Đã hủy session"));
    }

    @PatchMapping("/{id}/teacher")
    public ResponseEntity<RequestResponse> assignTeacher(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @RequestParam(required = false) Long teacherId) {
        SessionResponse data = sessionService.assignTeacher(id, teacherId);
        return ResponseEntity.ok(new RequestResponse(data,
                teacherId != null ? "Đã gán GV" : "Đã xóa GV"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId, @PathVariable Long id) {
        sessionService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa session thành công"));
    }
}