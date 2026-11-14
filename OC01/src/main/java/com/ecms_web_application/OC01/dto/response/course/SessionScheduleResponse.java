package com.ecms_web_application.OC01.dto.response.course;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Response cho lịch giảng dạy (INSTRUCTOR) và lịch học (STUDENT).
 * - Với INSTRUCTOR: có students (danh sách học viên trong buổi)
 * - Với STUDENT: students rỗng, có courseCode/courseTitle để hiển thị
 */
@Getter
@Setter
public class SessionScheduleResponse extends SessionResponse {

    private String courseCode;
    private String courseTitle;
    private List<StudentInfo> students = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentInfo {
        private Long studentId;
        private String studentCode;
        private String fullName;
        private String email;
        private String phone;
    }
}