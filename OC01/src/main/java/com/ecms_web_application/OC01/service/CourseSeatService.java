// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/service/CourseSeatService.java
// ============================================================
package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.response.course.AvailableSeatsResponse;

public interface CourseSeatService {

    /** Tính số chỗ trống hiện tại của COURSE — dùng cho ENROLLMENT_MODULE. */
    AvailableSeatsResponse getAvailableSeats(Long courseId);
}