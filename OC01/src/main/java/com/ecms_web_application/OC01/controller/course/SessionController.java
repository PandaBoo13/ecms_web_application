package com.ecms_web_application.OC01.controller.course;

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

    /**
     * API: Lấy danh sách buổi học
     * Method: GET /api/courses/{courseId}/sessions
     * Chức năng: Xem tất cả các buổi học (Lịch) của một khóa Offline.
     */
    @GetMapping
    public ResponseEntity<RequestResponse> list(@PathVariable Long courseId) {
        List<SessionResponse> data = sessionService.listByCourse(courseId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách session thành công"));
    }

    /**
     * API: Lấy thông tin một buổi học
     * Method: GET /api/courses/{courseId}/sessions/{id}
     * Chức năng: Xem chi tiết giờ giấc, giáo viên, phòng học của một buổi cụ thể.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(
            @PathVariable Long courseId, @PathVariable Long id) {
        SessionResponse data = sessionService.getById(courseId, id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy session thành công"));
    }

    /**
     * API: Thêm buổi học thủ công
     * Method: POST /api/courses/{courseId}/sessions
     * Chức năng: Thêm một buổi học vào lịch (không qua tính năng tạo tự động).
     */
    @PostMapping
    public ResponseEntity<RequestResponse> add(
            @PathVariable Long courseId,
            @Valid @RequestBody SessionCreateRequest request) {
        SessionResponse data = sessionService.addManual(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Thêm session thành công"));
    }

    /**
     * API: Hủy buổi học
     * Method: POST /api/courses/{courseId}/sessions/{id}/cancel
     * Chức năng: Đánh dấu buổi học bị hủy (bắt buộc nhập lý do).
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<RequestResponse> cancel(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @Valid @RequestBody SessionCancelRequest request) {
        SessionResponse data = sessionService.cancel(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Đã hủy session"));
    }

    /**
     * API: Gán giáo viên dạy thay (Legacy - Deprecated)
     * Method: PATCH /api/courses/{courseId}/sessions/{id}/teacher
     * Chức năng: Endpoint cũ, khuyên dùng /substitute-teacher thay thế.
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

    /**
     * API: Gán giáo viên dạy thay
     * Method: PATCH /api/courses/{courseId}/sessions/{id}/substitute-teacher
     * Chức năng: Chỉ định một giáo viên khác dạy thay cho buổi học này (không làm thay đổi giáo viên chính của khóa).
     */
    @PatchMapping("/{id}/substitute-teacher")
    public ResponseEntity<RequestResponse> assignSubstituteTeacher(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @RequestParam(required = false) Long teacherId) {
        SessionResponse data = sessionService.assignSubstituteTeacher(id, teacherId);
        return ResponseEntity.ok(new RequestResponse(data,
                teacherId != null ? "Đã gán GV dạy thay" : "Đã gỡ GV dạy thay"));
    }

    /**
     * API: Gán trợ giảng
     * Method: PATCH /api/courses/{courseId}/sessions/{id}/assistant
     * Chức năng: Chỉ định trợ giảng (Assistant) hỗ trợ cho buổi học này.
     */
    @PatchMapping("/{id}/assistant")
    public ResponseEntity<RequestResponse> assignAssistant(
            @PathVariable Long courseId,
            @PathVariable Long id,
            @RequestParam(required = false) Long assistantId) {
        SessionResponse data = sessionService.assignAssistant(id, assistantId);
        return ResponseEntity.ok(new RequestResponse(data,
                assistantId != null ? "Đã gán trợ giảng" : "Đã gỡ trợ giảng"));
    }

    /**
     * API: Tự động sinh danh sách buổi học
     * Method: POST /api/courses/{courseId}/sessions/generate
     * Chức năng: Dựa vào ngày bắt đầu, ngày kết thúc và các thứ trong tuần để sinh ra toàn bộ lịch học.
     */
    @PostMapping("/generate")
    public ResponseEntity<RequestResponse> generate(@PathVariable Long courseId) {
        var data = sessionService.generateSessions(courseId);
        return ResponseEntity.ok(new RequestResponse(data,
                "Sinh session hoàn tất: " + data.getGenerated() + "/" + data.getTotalDates()));
    }

    /**
     * API: Đánh dấu buổi học đã dạy xong
     * Method: POST /api/courses/{courseId}/sessions/{id}/done
     * Chức năng: Chuyển trạng thái buổi học thành COMPLETED và kích hoạt tính lại tiến độ (Progress).
     */
    @PostMapping("/{id}/done")
    public ResponseEntity<RequestResponse> markDone(
            @PathVariable Long courseId,
            @PathVariable Long id) {
        SessionResponse data = sessionService.markDone(id);
        return ResponseEntity.ok(new RequestResponse(data, "Đã đánh dấu buổi học hoàn thành"));
    }

    /**
     * API: Xóa buổi học
     * Method: DELETE /api/courses/{courseId}/sessions/{id}
     * Chức năng: Xóa vĩnh viễn buổi học khỏi hệ thống (không thể xóa buổi đã dạy xong).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(
            @PathVariable Long courseId, @PathVariable Long id) {
        sessionService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa session thành công"));
    }
}