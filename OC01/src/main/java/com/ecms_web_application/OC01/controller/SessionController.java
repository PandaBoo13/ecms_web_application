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
        SessionResponse data = sessionService.getById(courseId, id);
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

    /**
     * @deprecated Endpoint cũ, semantics đã đổi thành "gán GV dạy thay" (substitute).
     *  FE nên chuyển sang PATCH /{id}/substitute-teacher.
     *  Endpoint này sẽ bị gỡ ở phase sau.
     */
    @Deprecated
    @PatchMapping("/{id}/teacher")
    public ResponseEntity<RequestResponse> assignTeacherLegacy(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @RequestParam(required = false) Long teacherId) {
        log.warn("[DEPRECATED] PATCH /api/courses/{}/sessions/{}/teacher — dùng /substitute-teacher",
                courseId, id);
        SessionResponse data = sessionService.assignSubstituteTeacher(id, teacherId);
        return ResponseEntity.ok(new RequestResponse(data,
                teacherId != null ? "Đã gán GV dạy thay" : "Đã gỡ GV dạy thay"));
    }

    /** FR_CRS_009: gán/gỡ GV dạy thay. Không đụng session.teacher_id. */
    @PatchMapping("/{id}/substitute-teacher")
    public ResponseEntity<RequestResponse> assignSubstituteTeacher(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @RequestParam(required = false) Long teacherId) {
        SessionResponse data = sessionService.assignSubstituteTeacher(id, teacherId);
        return ResponseEntity.ok(new RequestResponse(data,
                teacherId != null ? "Đã gán GV dạy thay" : "Đã gỡ GV dạy thay"));
    }

    /** FR_CRS_009C: gán/gỡ trợ giảng. */
    @PatchMapping("/{id}/assistant")
    public ResponseEntity<RequestResponse> assignAssistant(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @RequestParam(required = false) Long assistantId) {
        SessionResponse data = sessionService.assignAssistant(id, assistantId);
        return ResponseEntity.ok(new RequestResponse(data,
                assistantId != null ? "Đã gán trợ giảng" : "Đã gỡ trợ giảng"));
    }

    /** FR_CRS_006: sinh session tự động từ schedule. */
    @PostMapping("/generate")
    public ResponseEntity<RequestResponse> generate(@PathVariable Long courseId) {
        var data = sessionService.generateSessions(courseId);
        return ResponseEntity.ok(new RequestResponse(data,
                "Sinh session hoàn tất: " + data.getGenerated() + "/" + data.getTotalDates()));
    }

    /** Đánh dấu session DONE + trigger recalc Offline progress. */
    @PostMapping("/{id}/done")
    public ResponseEntity<RequestResponse> markDone(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        SessionResponse data = sessionService.markDone(id);
        return ResponseEntity.ok(new RequestResponse(data, "Đã đánh dấu buổi học hoàn thành"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId, @PathVariable Long id) {
        sessionService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa session thành công"));
    }
}