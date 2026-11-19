// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/dto/response/course/AvailableSeatsResponse.java
// ============================================================
package com.ecms_web_application.OC01.dto.response.course;

/**
 * Kết quả trả về cho ENROLLMENT_MODULE khi hỏi chỗ trống.
 * isFull = true chỉ khi maxStudents != null và availableSeats <= 0.
 * isOpenForEnrollment = true chỉ khi COURSE.status == PUBLISHED.
 */
public record AvailableSeatsResponse(
        Long courseId,
        String courseCode,
        String courseTitle,
        String courseType,
        String status,
        Integer maxStudents,
        Integer occupiedSeats,
        Integer availableSeats,
        boolean isFull,
        boolean isOpenForEnrollment,
        String reason
) {}