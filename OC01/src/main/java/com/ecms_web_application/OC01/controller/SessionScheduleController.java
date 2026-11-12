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

/**
 * [M1] + [M2] — Lịch giảng dạy / Lịch học cá nhân
 * Tự động phân nhánh theo role: INSTRUCTOR → teaching, STUDENT → learning.
 */
@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionScheduleController {

    private final SessionService sessionService;

    /**
     * GET /api/sessions/my-schedule?from=yyyy-MM-dd&to=yyyy-MM-dd
     * - INSTRUCTOR: trả lịch giảng dạy + danh sách học viên trong mỗi buổi
     * - STUDENT: trả lịch học các course đã ghi danh
     * Mặc định: from = hôm nay - 7 ngày, to = hôm nay + 30 ngày.
     */
    @GetMapping("/my-schedule")
    public ResponseEntity<RequestResponse> getMySchedule(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        if (from == null) from = LocalDate.now().minusDays(7);
        if (to == null) to = LocalDate.now().plusDays(30);
        if (to.isBefore(from)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "'to' phải >= 'from'");
        }

        Long accountId = SecurityUtils.requireCurrentAccountId();

        if (SecurityUtils.hasRole("INSTRUCTOR")) {
            return ResponseEntity.ok(new RequestResponse(
                    sessionService.getMyInstructorSchedule(accountId, from, to),
                    "Lấy lịch giảng dạy thành công"));
        }
        if (SecurityUtils.hasRole("STUDENT")) {
            return ResponseEntity.ok(new RequestResponse(
                    sessionService.getMyStudentSchedule(accountId, from, to),
                    "Lấy lịch học thành công"));
        }

        throw new ErrorHandler(HttpStatus.FORBIDDEN,
                "Chỉ INSTRUCTOR hoặc STUDENT mới dùng được API này");
    }
}