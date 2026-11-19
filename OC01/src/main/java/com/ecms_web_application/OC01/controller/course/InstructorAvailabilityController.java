// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/controller/InstructorAvailabilityController.java
// ============================================================
package com.ecms_web_application.OC01.controller.course;

import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.AvailabilityResponse;
import com.ecms_web_application.OC01.service.AvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/instructors")
@RequiredArgsConstructor
public class InstructorAvailabilityController {

    private final AvailabilityService availabilityService;

    /**
     * Kiểm tra INSTRUCTOR có rảnh trong khoảng thời gian không.
     * Trả về busy slots + freeWindows + weeklyLoad (tải theo tuần).
     *
     * @param id   INSTRUCTOR accountId
     * @param from LocalDateTime (ISO)
     * @param to   LocalDateTime
     */
    @GetMapping("/{id}/availability")
    public ResponseEntity<RequestResponse> availability(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        AvailabilityResponse data = availabilityService.checkInstructorAvailability(id, from, to);
        String msg = data.isAvailable()
                ? "Giảng viên rảnh trong khoảng thời gian yêu cầu"
                : "Giảng viên đang có " + data.busySlots().size() + " buổi dạy trùng lịch";
        return ResponseEntity.ok(new RequestResponse(data, msg));
    }
}