package com.ecms_web_application.OC01.controller.course;

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

@RestController
@RequestMapping("/api/instructors")
@RequiredArgsConstructor
@Slf4j
public class InstructorSpecializationController {

    private final InstructorSpecializationService specializationService;

    // ============================================================
    // SELF (/me/specializations)
    // ============================================================

    /**
     * API: Lấy danh sách chuyên môn của chính mình
     * Method: GET /api/instructors/me/specializations
     * Chức năng: Giảng viên đang đăng nhập xem các chuyên môn (danh mục) mà mình phụ trách.
     */
    @GetMapping("/me/specializations")
    public ResponseEntity<RequestResponse> getMySpecializations() {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        List<InstructorSpecializationResponse> data = specializationService.getByAccount(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chuyên môn thành công"));
    }

    /**
     * API: Thêm chuyên môn cho chính mình
     * Method: POST /api/instructors/me/specializations
     * Chức năng: Giảng viên tự đăng ký thêm 1 danh mục chuyên môn.
     */
    @PostMapping("/me/specializations")
    public ResponseEntity<RequestResponse> addMySpecialization(
            @Valid @RequestBody SpecializationAddRequest request) {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        InstructorSpecializationResponse data = specializationService.add(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Thêm chuyên môn thành công"));
    }

    /**
     * API: Xóa một chuyên môn của chính mình
     * Method: DELETE /api/instructors/me/specializations/{categoryId}
     * Chức năng: Gỡ bỏ 1 danh mục chuyên môn của giảng viên hiện tại.
     */
    @DeleteMapping("/me/specializations/{categoryId}")
    public ResponseEntity<RequestResponse> removeMySpecialization(@PathVariable Long categoryId) {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.remove(accountId, categoryId);
        return ResponseEntity.ok(new RequestResponse("Xóa chuyên môn thành công"));
    }

    /**
     * API: Đặt chuyên môn chính
     * Method: PATCH /api/instructors/me/specializations/{categoryId}/primary
     * Chức năng: Đánh dấu 1 danh mục là chuyên môn chính (nổi bật nhất) của giảng viên.
     */
    @PatchMapping("/me/specializations/{categoryId}/primary")
    public ResponseEntity<RequestResponse> setMyPrimary(@PathVariable Long categoryId) {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.setPrimary(accountId, categoryId);
        return ResponseEntity.ok(new RequestResponse("Đặt chuyên môn chính thành công"));
    }

    /**
     * API: Bỏ chuyên môn chính
     * Method: DELETE /api/instructors/me/specializations/primary
     * Chức năng: Hủy đánh dấu chuyên môn chính hiện tại.
     */
    @DeleteMapping("/me/specializations/primary")
    public ResponseEntity<RequestResponse> clearMyPrimary() {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.clearPrimary(accountId);
        return ResponseEntity.ok(new RequestResponse("Bỏ chuyên môn chính thành công"));
    }

    /**
     * API: Xóa toàn bộ chuyên môn
     * Method: DELETE /api/instructors/me/specializations
     * Chức năng: Reset toàn bộ danh mục chuyên môn của giảng viên hiện tại.
     */
    @DeleteMapping("/me/specializations")
    public ResponseEntity<RequestResponse> removeAllMy() {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        specializationService.removeAll(accountId);
        return ResponseEntity.ok(new RequestResponse("Xóa tất cả chuyên môn thành công"));
    }

    // ============================================================
    // ADMIN — theo accountId
    // ============================================================

    /**
     * API: Lấy chuyên môn của giảng viên bất kỳ
     * Method: GET /api/instructors/{accountId}/specializations
     * Chức năng: Admin xem danh sách chuyên môn của một tài khoản.
     */
    @GetMapping("/{accountId}/specializations")
    public ResponseEntity<RequestResponse> getByAccount(@PathVariable Long accountId) {
        List<InstructorSpecializationResponse> data = specializationService.getByAccount(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chuyên môn thành công"));
    }

    /**
     * API: Thêm chuyên môn cho giảng viên
     * Method: POST /api/instructors/{accountId}/specializations
     * Chức năng: Admin gán chuyên môn vào tài khoản giảng viên.
     */
    @PostMapping("/{accountId}/specializations")
    public ResponseEntity<RequestResponse> addForAccount(
            @PathVariable Long accountId,
            @Valid @RequestBody SpecializationAddRequest request) {
        InstructorSpecializationResponse data = specializationService.add(accountId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Thêm chuyên môn thành công"));
    }

    /**
     * API: Xóa chuyên môn của giảng viên
     * Method: DELETE /api/instructors/{accountId}/specializations/{categoryId}
     * Chức năng: Admin gỡ bỏ 1 danh mục chuyên môn của giảng viên.
     */
    @DeleteMapping("/{accountId}/specializations/{categoryId}")
    public ResponseEntity<RequestResponse> removeForAccount(
            @PathVariable Long accountId,
            @PathVariable Long categoryId) {
        specializationService.remove(accountId, categoryId);
        return ResponseEntity.ok(new RequestResponse("Xóa chuyên môn thành công"));
    }

    /**
     * API: Lấy chuyên môn chính của giảng viên
     * Method: GET /api/instructors/{accountId}/specializations/primary
     * Chức năng: Admin xem chuyên môn chính của một tài khoản.
     */
    @GetMapping("/{accountId}/specializations/primary")
    public ResponseEntity<RequestResponse> getPrimaryOfAccount(@PathVariable Long accountId) {
        List<InstructorSpecializationResponse> data = specializationService.getPrimaryOfAccount(accountId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chuyên môn chính thành công"));
    }

    // ============================================================
    // ADMIN — theo categoryId
    // ============================================================

    /**
     * API: Lấy danh sách giảng viên theo chuyên môn
     * Method: GET /api/instructors/category/{categoryId}/specializations
     * Chức năng: Admin tìm tất cả giảng viên có cùng 1 chuyên môn (VD: Danh mục IELTS).
     */
    @GetMapping("/category/{categoryId}/specializations")
    public ResponseEntity<RequestResponse> getByCategory(@PathVariable Long categoryId) {
        List<InstructorSpecializationResponse> data = specializationService.getByCategory(categoryId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách giảng viên thành công"));
    }
}