// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/service/AvailabilityService.java
// ============================================================
package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.response.course.AvailabilityResponse;

import java.time.LocalDateTime;

public interface AvailabilityService {

    /** Kiểm tra ROOM có trống trong khoảng [from, to) không. */
    AvailabilityResponse checkRoomAvailability(Long roomId, LocalDateTime from, LocalDateTime to);

    /** Kiểm tra INSTRUCTOR có rảnh trong khoảng [from, to) không + tải theo tuần. */
    AvailabilityResponse checkInstructorAvailability(Long instructorId, LocalDateTime from, LocalDateTime to);
}