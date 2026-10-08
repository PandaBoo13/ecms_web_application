//package com.ecms_web_application.OC01.controller;
//
//import jakarta.validation.Valid;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.PageRequest;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.domain.Sort;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//import org.wisdom.oc01.config.SecurityUtils;
//import org.wisdom.oc01.dto.RequestResponse;
//import org.wisdom.oc01.dto.request.request.CreateRequestRequest;
//import org.wisdom.oc01.dto.request.request.ProcessRequestRequest;
//import org.wisdom.oc01.dto.response.request.RequestDetailResponse;
//import org.wisdom.oc01.exception.ErrorHandler;
//import org.wisdom.oc01.service.RequestService;
//
//@RestController
//@RequestMapping("/api/requests")
//@RequiredArgsConstructor
//@Slf4j
//public class RequestController {
//
//    private final RequestService requestService;
//
//    // ============================================================
//    // USER
//    // ============================================================
//
//    /** 1. [USER] Tạo yêu cầu mới */
//    @PostMapping
//    public ResponseEntity<RequestResponse> create(
//            @Valid @RequestBody CreateRequestRequest request) {
//        RequestDetailResponse data = requestService.create(request);
//        return ResponseEntity.status(HttpStatus.CREATED)
//                .body(new RequestResponse(data, "Đã gửi yêu cầu, chờ xử lý"));
//    }
//
//    /** 2. [USER] DS yêu cầu của tôi */
//    @GetMapping("/my")
//    public ResponseEntity<RequestResponse> getMyRequests(
//            @RequestParam(required = false) String type,
//            @RequestParam(required = false) String status,
//            @RequestParam(defaultValue = "0") int page,
//            @RequestParam(defaultValue = "20") int size) {
//
//        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
//        Page<RequestDetailResponse> data = requestService.getMyRequests(type, status, pageable);
//        return ResponseEntity.ok(new RequestResponse(data, "Danh sách yêu cầu của tôi"));
//    }
//
//    /** 3. [USER] Chi tiết yêu cầu của tôi */
//    @GetMapping("/my/{id}")
//    public ResponseEntity<RequestResponse> getMyRequestDetail(@PathVariable Long id) {
//        RequestDetailResponse data = requestService.getMyRequestDetail(id);
//        return ResponseEntity.ok(new RequestResponse(data, "Chi tiết yêu cầu"));
//    }
//
//    /** 4. [USER] Hủy yêu cầu của mình */
//    @PostMapping("/my/{id}/cancel")
//    public ResponseEntity<RequestResponse> cancel(@PathVariable Long id) {
//        requestService.cancel(id);
//        return ResponseEntity.ok(new RequestResponse("Đã hủy yêu cầu"));
//    }
//
//    // ============================================================
//    // ADMIN
//    // ============================================================
//
//    /** 5. [ADMIN] Tìm kiếm tất cả yêu cầu */
//    @GetMapping("/admin")           // 🆕 đổi path
//    public ResponseEntity<RequestResponse> searchRequests(
//            @RequestParam(required = false) String type,
//            @RequestParam(required = false) String status,
//            @RequestParam(required = false) String keyword,
//            @RequestParam(defaultValue = "0") int page,
//            @RequestParam(defaultValue = "20") int size) {
//
//        if (!SecurityUtils.hasRole("ADMIN")) {
//            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ ADMIN");
//        }
//
//        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
//        Page<RequestDetailResponse> data =
//                requestService.searchRequests(type, status, keyword, pageable);
//        return ResponseEntity.ok(new RequestResponse(data, "Danh sách yêu cầu"));
//    }
//
//    /** 6. [ADMIN] Chi tiết */
//    @GetMapping("/admin/{id}")      // 🆕 đổi path
//    public ResponseEntity<RequestResponse> getRequestDetail(@PathVariable Long id) {
//        if (!SecurityUtils.hasRole("ADMIN")) {
//            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ ADMIN");
//        }
//        RequestDetailResponse data = requestService.getRequestDetail(id);
//        return ResponseEntity.ok(new RequestResponse(data, "Chi tiết yêu cầu"));
//    }
//
//    /** 7. [ADMIN] Duyệt / Từ chối */
//    @PostMapping("/{id}/process")
//    public ResponseEntity<RequestResponse> processRequest(
//            @PathVariable Long id,
//            @Valid @RequestBody ProcessRequestRequest request) {
//
//        if (!SecurityUtils.hasRole("ADMIN")) {
//            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ ADMIN");
//        }
//
//        requestService.processRequest(id, request);
//        String msg = Boolean.TRUE.equals(request.getApproved())
//                ? "Đã duyệt yêu cầu" : "Đã từ chối yêu cầu";
//        return ResponseEntity.ok(new RequestResponse(msg));
//    }
//}