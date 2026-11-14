package com.ecms_web_application.OC01.dto.response.course;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class EnrolledCourseResponse {
    private Long enrollmentId;
    private Long courseId;
    private String courseCode;
    private String courseTitle;
    private String thumbnailUrl;
    private String enrollmentStatus; // ACTIVE, PENDING, COMPLETED...
    private LocalDateTime enrolledAt;

    // (Tùy chọn) Nếu bạn muốn hiển thị thanh tiến độ ngay trên thẻ Card
    private Double progressPercentage;
}