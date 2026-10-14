package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.RoomRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.RoomResponse;
import com.ecms_web_application.OC01.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@Slf4j
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<RequestResponse> listAll() {
        List<RoomResponse> data = roomService.listAll();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách phòng thành công"));
    }

    @GetMapping("/active")
    public ResponseEntity<RequestResponse> listActive() {
        List<RoomResponse> data = roomService.listActive();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách phòng đang hoạt động"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        RoomResponse data = roomService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy phòng thành công"));
    }

    @PostMapping
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody RoomRequest request) {
        RoomResponse data = roomService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo phòng thành công"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RoomRequest request) {
        RoomResponse data = roomService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật phòng thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(@PathVariable Long id) {
        roomService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa phòng thành công"));
    }
}