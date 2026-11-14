// ============================================================
// FILE: ./src/main/java/com/ecms_web_application/OC01/controller/InternalCourseController.java
// ============================================================
package com.ecms_web_application.OC01.controller.course;

import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.course.AvailableSeatsResponse;
import com.ecms_web_application.OC01.service.CourseSeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * INTERNAL_SERVICE endpoint — dành cho ENROLLMENT_MODULE (service-to-service).
 * Không public ra Internet. Hiện tại chưa có filter auth riêng
 * (sẽ bổ sung API key filter khi cần).
 */
@RestController
@RequestMapping("/api/internal/courses")
@RequiredArgsConstructor
public class InternalCourseController {

    private final CourseSeatService courseSeatService;

    /**
     * Trả về thông tin chỗ trống của COURSE:
     *   - maxStudents       : tổng sức chứa (null nếu không giới hạn)
     *   - occupiedSeats     : số chỗ đã bị chiếm (max của: hoá đơn hiệu lực,
     *                         enrollment, currentStudents)
     *   - availableSeats    : còn lại
     *   - isFull            : true nếu đã đầy
     *   - isOpenForEnrollment : true nếu COURSE.status == PUBLISHED
     */
    @GetMapping("/{id}/available-seats")
    public ResponseEntity<RequestResponse> availableSeats(@PathVariable Long id) {
        AvailableSeatsResponse data = courseSeatService.getAvailableSeats(id);
        return ResponseEntity.ok(new RequestResponse(data,
                data.isOpenForEnrollment()
                        ? (data.isFull() ? "COURSE đã đủ sĩ số" : "COURSE còn chỗ")
                        : "COURSE chưa mở đăng ký"));
    }
}