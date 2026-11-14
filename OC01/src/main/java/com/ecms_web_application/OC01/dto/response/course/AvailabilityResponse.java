// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/dto/response/course/AvailabilityResponse.java
// ============================================================
package com.ecms_web_application.OC01.dto.response.course;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Response dùng chung cho:
 *   - GET /api/rooms/{id}/availability
 *   - GET /api/instructors/{id}/availability
 *
 * weeklyLoad chỉ có ở INSTRUCTOR (null với ROOM).
 */
public record AvailabilityResponse(
        String targetType,           // "ROOM" | "INSTRUCTOR"
        Long targetId,
        String targetName,
        LocalDateTime from,
        LocalDateTime to,
        boolean isAvailable,         // true nếu không có busy slot nào
        List<BusySlotInfo> busySlots,
        List<FreeWindowInfo> freeWindows,
        Map<String, Integer> weeklyLoad   // chỉ INSTRUCTOR; ROOM = null
) {
    public record BusySlotInfo(
            Long sessionId,
            Long courseId,
            String courseTitle,
            LocalDateTime startTime,
            LocalDateTime endTime
    ) {}

    public record FreeWindowInfo(
            LocalDateTime from,
            LocalDateTime to
    ) {}
}