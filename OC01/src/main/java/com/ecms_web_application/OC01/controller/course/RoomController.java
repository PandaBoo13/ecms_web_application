package com.ecms_web_application.OC01.controller.course;

import com.ecms_web_application.OC01.dto.request.RoomRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.RoomResponse;
import com.ecms_web_application.OC01.dto.response.course.AvailabilityResponse;
import com.ecms_web_application.OC01.service.AvailabilityService;
import com.ecms_web_application.OC01.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Slf4j
public class RoomController {

    private final RoomService roomService;
    private final AvailabilityService availabilityService;

    /**
     * API: Lấy tất cả phòng học
     * Method: GET /api/rooms
     * Chức năng: Admin xem danh sách toàn bộ phòng học (bao gồm cả phòng đã ngưng hoạt động).
     */
    @GetMapping
    public ResponseEntity<RequestResponse> listAll() {
        List<RoomResponse> data = roomService.listAll();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách phòng thành công"));
    }

    /**
     * API: Lấy danh sách phòng đang hoạt động
     * Method: GET /api/rooms/active
     * Chức năng: Lấy các phòng có thể dùng để xếp lịch dạy (bỏ qua phòng đang bảo trì).
     */
    @GetMapping("/active")
    public ResponseEntity<RequestResponse> listActive() {
        List<RoomResponse> data = roomService.listActive();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách phòng đang hoạt động"));
    }

    /**
     * API: Kiểm tra lịch trống của phòng
     * Method: GET /api/rooms/{id}/availability
     * Chức năng: Truyền vào thời gian bắt đầu (from) và kết thúc (to), hệ thống báo phòng có bị trùng lịch không và các khung giờ còn trống.
     */
    @GetMapping("/{id}/availability")
    public ResponseEntity<RequestResponse> availability(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        AvailabilityResponse data = availabilityService.checkRoomAvailability(id, from, to);
        String msg = data.isAvailable()
                ? "Phòng trống trong khoảng thời gian yêu cầu"
                : "Phòng đang có " + data.busySlots().size() + " buổi học trùng lịch";
        return ResponseEntity.ok(new RequestResponse(data, msg));
    }

    /**
     * API: Lấy thông tin một phòng
     * Method: GET /api/rooms/{id}
     * Chức năng: Xem chi tiết (sức chứa, vị trí) của một phòng.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        RoomResponse data = roomService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy phòng thành công"));
    }

    /**
     * API: Tạo phòng học mới
     * Method: POST /api/rooms
     * Chức năng: Thêm phòng vào hệ thống (VD: Phòng 101, sức chứa 30).
     */
    @PostMapping
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody RoomRequest request) {
        RoomResponse data = roomService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo phòng thành công"));
    }

    /**
     * API: Cập nhật thông tin phòng
     * Method: PUT /api/rooms/{id}
     * Chức năng: Sửa tên, sức chứa hoặc trạng thái hoạt động của phòng.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RoomRequest request) {
        RoomResponse data = roomService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật phòng thành công"));
    }

    /**
     * API: Xóa phòng
     * Method: DELETE /api/rooms/{id}
     * Chức năng: Xóa phòng học khỏi hệ thống.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(@PathVariable Long id) {
        roomService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa phòng thành công"));
    }
}