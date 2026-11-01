package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.enrollment.ReplaceSessionAbsencesRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/courses/{courseId}/sessions/{sessionId}/attendance")
@RequiredArgsConstructor
public class EnrollmentAttendanceController {
    private final EnrollmentService enrollmentService;

    @GetMapping
    public ResponseEntity<RequestResponse> get(@PathVariable Long courseId, @PathVariable Long sessionId) {
        return ResponseEntity.ok(new RequestResponse(enrollmentService.getSessionAttendance(courseId, sessionId),
                "Lấy danh sách điểm danh thành công"));
    }

    @PostMapping("/absences")
    public ResponseEntity<RequestResponse> recordAbsences(@PathVariable Long courseId,
            @PathVariable Long sessionId, @Valid @RequestBody ReplaceSessionAbsencesRequest request) {
        return ResponseEntity.ok(new RequestResponse(
                enrollmentService.replaceSessionAbsences(courseId, sessionId, request),
                "Đã ghi nhận các trường hợp vắng mặt mới; dữ liệu vắng trước đó được giữ nguyên"));
    }
}
