package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/instructor/attendance")
@RequiredArgsConstructor
public class InstructorAttendanceController {
    private final SessionService sessionService;

    @GetMapping("/courses")
    public ResponseEntity<RequestResponse> getAssignedCourses() {
        if (!SecurityUtils.hasRole("INSTRUCTOR")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ giảng viên mới xem được khóa học điểm danh");
        }
        return ResponseEntity.ok(new RequestResponse(
                sessionService.getMyAttendanceCourses(SecurityUtils.requireCurrentAccountId()),
                "Lấy danh sách khóa OFFLINE được phân công thành công"));
    }

    @GetMapping("/sessions")
    public ResponseEntity<RequestResponse> getAssignedSessions(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (!SecurityUtils.hasRole("INSTRUCTOR")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ giảng viên mới xem được lịch điểm danh");
        }

        LocalDate today = LocalDate.now();
        if (from == null) from = today.minusDays(30);
        if (to == null) to = today.plusDays(60);
        if (to.isBefore(from)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "'to' phải >= 'from'");
        }

        return ResponseEntity.ok(new RequestResponse(
                sessionService.getMyAttendanceSessions(SecurityUtils.requireCurrentAccountId(), from, to),
                "Lấy danh sách buổi được phân công điểm danh thành công"));
    }
}
