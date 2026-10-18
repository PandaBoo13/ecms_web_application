package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.GuardianRequest;
import com.ecms_web_application.OC01.dto.request.StudentAccountLockRequest;
import com.ecms_web_application.OC01.dto.request.StudentConvertFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.StudentCreateRequest;
import com.ecms_web_application.OC01.dto.request.StudentStatusChangeRequest;
import com.ecms_web_application.OC01.dto.request.StudentUpdateRequest;
import com.ecms_web_application.OC01.dto.response.AcademicHistoryResponse;
import com.ecms_web_application.OC01.dto.response.GuardianResponse;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.StudentDetailResponse;
import com.ecms_web_application.OC01.dto.response.StudentResponse;
import com.ecms_web_application.OC01.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Slf4j
public class StudentController {

    private final StudentService studentService;

    /**
     * POST /api/students — Tạo mới học viên thủ công
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody StudentCreateRequest request) {
        StudentResponse data = studentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo học viên thành công"));
    }

    /**
     * POST /api/students/convert-lead — Chuyển đổi Lead thành Student (Idempotent)
     */
    @PostMapping("/convert-lead")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> convertFromLead(@Valid @RequestBody StudentConvertFromLeadRequest request) {
        StudentResponse data = studentService.convertFromLead(request);
        return ResponseEntity.ok(new RequestResponse(data, "Chuyển đổi Lead sang Student thành công"));
    }

    /**
     * GET /api/students — Lấy danh sách học viên (phân trang + lọc theo status + tìm kiếm)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = "asc".equalsIgnoreCase(direction)
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<StudentResponse> data = studentService.search(search, status, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách học viên thành công"));
    }

    /**
     * GET /api/students/{id} — Lấy thông tin cơ bản học viên theo ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        StudentResponse data = studentService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy thông tin học viên thành công"));
    }

    /**
     * GET /api/students/{id}/detail — Lấy thông tin chi tiết học viên kèm người giám hộ và lịch sử học
     */
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getDetailById(@PathVariable Long id) {
        StudentDetailResponse data = studentService.getDetailById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chi tiết học viên thành công"));
    }

    /**
     * GET /api/students/code/{studentCode} — Lấy thông tin học viên theo mã
     */
    @GetMapping("/code/{studentCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getByStudentCode(@PathVariable String studentCode) {
        StudentResponse data = studentService.getByStudentCode(studentCode);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy thông tin học viên thành công"));
    }

    /**
     * PUT /api/students/{id} — Cập nhật thông tin học viên (Mã học viên bất biến không được sửa)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody StudentUpdateRequest request
    ) {
        StudentResponse data = studentService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật học viên thành công"));
    }

    /**
     * PATCH /api/students/{id}/status — Đổi trạng thái học viên (kèm lý do)
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StudentStatusChangeRequest request
    ) {
        StudentResponse data = studentService.updateStatus(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật trạng thái học viên thành công"));
    }

    /**
     * PATCH /api/students/{id}/lock-account — Khóa / Mở khóa tài khoản đăng nhập của học viên
     */
    @PatchMapping("/{id}/lock-account")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> lockAccount(
            @PathVariable Long id,
            @Valid @RequestBody StudentAccountLockRequest request
    ) {
        StudentResponse data = studentService.lockAccount(id, request);
        String msg = Boolean.TRUE.equals(request.getIsLocked())
                ? "Khóa tài khoản học viên thành công"
                : "Mở khóa tài khoản học viên thành công";
        return ResponseEntity.ok(new RequestResponse(data, msg));
    }

    /**
     * POST /api/students/{id}/guardians — Thêm người giám hộ cho học viên
     */
    @PostMapping("/{id}/guardians")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> addGuardian(
            @PathVariable Long id,
            @Valid @RequestBody GuardianRequest request
    ) {
        GuardianResponse data = studentService.addGuardian(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Thêm người giám hộ thành công"));
    }

    /**
     * GET /api/students/{id}/guardians — Danh sách người giám hộ của học viên
     */
    @GetMapping("/{id}/guardians")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getGuardians(@PathVariable Long id) {
        List<GuardianResponse> data = studentService.getGuardians(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách người giám hộ thành công"));
    }

    /**
     * DELETE /api/students/{id}/guardians/{guardianId} — Xóa người giám hộ
     */
    @DeleteMapping("/{id}/guardians/{guardianId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> deleteGuardian(
            @PathVariable Long id,
            @PathVariable Long guardianId
    ) {
        studentService.deleteGuardian(id, guardianId);
        return ResponseEntity.ok(new RequestResponse("Xóa người giám hộ thành công"));
    }

    /**
     * GET /api/students/{id}/academic-histories — Lấy lịch sử học tập của học viên
     */
    @GetMapping("/{id}/academic-histories")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getAcademicHistories(@PathVariable Long id) {
        List<AcademicHistoryResponse> data = studentService.getAcademicHistories(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy lịch sử học tập thành công"));
    }

    /**
     * DELETE /api/students/{id} — Xóa mềm học viên (chuyển status thành INACTIVE)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RequestResponse> delete(@PathVariable Long id) {
        studentService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa học viên thành công"));
    }
}
