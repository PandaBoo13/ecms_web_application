package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.SpecializationAddRequest;
import com.ecms_web_application.OC01.dto.response.InstructorSpecializationResponse;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.InstructorSpecializationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Instructor Specialization API — /api/instructors
 *
 * Self (USER):
 *  - GET    /me/specializations
 *  - POST   /me/specializations
 *  - DELETE /me/specializations/{categoryId}
 *  - PATCH  /me/specializations/{categoryId}/primary
 *  - DELETE /me/specializations/primary
 *  - DELETE /me/specializations
 *
 * Admin (PROTECTED):
 *  - GET    /{accountId}/specializations
 *  - POST   /{accountId}/specializations
 *  - DELETE /{accountId}/specializations/{categoryId}
 *  - GET    /{accountId}/specializations/primary
 *  - GET    /category/{categoryId}/specializations
 */
@RestController
@RequestMapping("/api/instructors")
@RequiredArgsConstructor
@Slf4j
public class InstructorSpecializationController {

    private final InstructorSpecializationService specializationService;

    // ============================================================
    // SELF (/me/specializations)
    // ============================================================

    /** GET /api/instructors/me/specializations */
    @GetMapping("/me/specializations")
    public ResponseEntity<RequestResponse> getMySpecializations() {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        List<InstructorSpecializationResponse> data = specializationService.getByAccount(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chuyên môn thành công"));
    }

    /** POST /api/instructors/me/specializations */
    @PostMapping("/me/specializations")
    public ResponseEntity<RequestResponse> addMySpecialization(
            @Valid @RequestBody SpecializationAddRequest request) {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        InstructorSpecializationResponse data = specializationService.add(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Thêm chuyên môn thành công"));
    }

    /** DELETE /api/instructors/me/specializations/{categoryId} */
    @DeleteMapping("/me/specializations/{categoryId}")
    public ResponseEntity<RequestResponse> removeMySpecialization(@PathVariable Long categoryId) {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.remove(accountId, categoryId);
        return ResponseEntity.ok(new RequestResponse("Xóa chuyên môn thành công"));
    }

    /** PATCH /api/instructors/me/specializations/{categoryId}/primary */
    @PatchMapping("/me/specializations/{categoryId}/primary")
    public ResponseEntity<RequestResponse> setMyPrimary(@PathVariable Long categoryId) {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.setPrimary(accountId, categoryId);
        return ResponseEntity.ok(new RequestResponse("Đặt chuyên môn chính thành công"));
    }

    /** DELETE /api/instructors/me/specializations/primary */
    @DeleteMapping("/me/specializations/primary")
    public ResponseEntity<RequestResponse> clearMyPrimary() {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.clearPrimary(accountId);
        return ResponseEntity.ok(new RequestResponse("Bỏ chuyên môn chính thành công"));
    }

    /** DELETE /api/instructors/me/specializations */
    @DeleteMapping("/me/specializations")
    public ResponseEntity<RequestResponse> removeAllMy() {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.removeAll(accountId);
        return ResponseEntity.ok(new RequestResponse("Xóa tất cả chuyên môn thành công"));
    }

    // ============================================================
    // ADMIN — theo accountId
    // ============================================================

    /** GET /api/instructors/{accountId}/specializations */
    @GetMapping("/{accountId}/specializations")
    public ResponseEntity<RequestResponse> getByAccount(@PathVariable Long accountId) {
        List<InstructorSpecializationResponse> data = specializationService.getByAccount(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chuyên môn thành công"));
    }

    /** POST /api/instructors/{accountId}/specializations */
    @PostMapping("/{accountId}/specializations")
    public ResponseEntity<RequestResponse> addForAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody SpecializationAddRequest request) {
        InstructorSpecializationResponse data = specializationService.add(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Thêm chuyên môn thành công"));
    }

    /** DELETE /api/instructors/{accountId}/specializations/{categoryId} */
    @DeleteMapping("/{accountId}/specializations/{categoryId}")
    public ResponseEntity<RequestResponse> removeForAccount(
            @PathVariable Long accountId,
            @PathVariable Long categoryId) {
        specializationService.remove(accountId, categoryId);
        return ResponseEntity.ok(new RequestResponse("Xóa chuyên môn thành công"));
    }

    /** GET /api/instructors/{accountId}/specializations/primary */
    @GetMapping("/{accountId}/specializations/primary")
    public ResponseEntity<RequestResponse> getPrimaryOfAccount(@PathVariable Long accountId) {
        List<InstructorSpecializationResponse> data = specializationService.getPrimaryOfAccount(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chuyên môn chính thành công"));
    }

    // ============================================================
    // ADMIN — theo categoryId
    // ============================================================

    /** GET /api/instructors/category/{categoryId}/specializations */
    @GetMapping("/category/{categoryId}/specializations")
    public ResponseEntity<RequestResponse> getByCategory(@PathVariable Long categoryId) {
        List<InstructorSpecializationResponse> data = specializationService.getByCategory(categoryId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách giảng viên thành công"));
    }
}