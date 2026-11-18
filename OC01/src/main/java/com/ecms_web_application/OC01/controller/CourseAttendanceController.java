package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.EnrollmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/courses/{courseId}/attendance")
@RequiredArgsConstructor
public class CourseAttendanceController {
    private final EnrollmentService enrollmentService;

    /** Ma trận điểm danh học viên × buổi của khóa OFFLINE. */
    @GetMapping
    public ResponseEntity<RequestResponse> getMatrix(@PathVariable Long courseId) {
        return ResponseEntity.ok(new RequestResponse(
                enrollmentService.getCourseAttendanceMatrix(courseId),
                "Lấy ma trận điểm danh thành công"));
    }

    /** Xuất ma trận điểm danh ra Excel. */
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@PathVariable Long courseId) {
        byte[] content = enrollmentService.exportCourseAttendance(courseId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("diem-danh-khoa-" + courseId + ".xlsx", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }
}
