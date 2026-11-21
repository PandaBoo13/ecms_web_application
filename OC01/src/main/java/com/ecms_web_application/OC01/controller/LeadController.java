package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.LeadAssignRequest;
import com.ecms_web_application.OC01.dto.request.LeadCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadInteractionCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadPlacementTestCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadUpdateRequest;
import com.ecms_web_application.OC01.dto.response.ConsultantResponse;
import com.ecms_web_application.OC01.dto.response.LeadDetailResponse;
import com.ecms_web_application.OC01.dto.response.LeadInteractionResponse;
import com.ecms_web_application.OC01.dto.response.LeadPlacementTestResponse;
import com.ecms_web_application.OC01.dto.response.LeadResponse;
import com.ecms_web_application.OC01.dto.response.LeadStatisticsResponse;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.ecms_web_application.OC01.config.SecurityUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
@Slf4j
public class LeadController {

    private final LeadService leadService;

    /**
     * POST /api/leads — Tạo mới Lead (cho phép khách đăng ký từ landing page hoặc nhân viên tạo từ admin)
     */
    @PostMapping
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody LeadCreateRequest request) {
        LeadResponse data = leadService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo Lead thành công"));
    }

    /**
     * GET /api/leads — Lấy danh sách Lead (phân trang + lọc theo status, courseId, sourceId, consultant, inQueue, tìm kiếm)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long sourceId,
            @RequestParam(required = false) Long consultantId,
            @RequestParam(required = false) Boolean inQueue,
            @RequestParam(required = false) Boolean hasOpenInvoice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        String sortProperty = switch (sortBy.toLowerCase()) {
            case "created_at", "createdat" -> "createdAt";
            case "updated_at", "updatedat" -> "updatedAt";
            case "full_name", "fullname" -> "fullName";
            case "course_id", "courseid" -> "courseId";
            case "student_id", "studentid" -> "studentId";
            case "email" -> "email";
            case "phone" -> "phone";
            case "status" -> "status";
            case "id" -> "id";
            default -> sortBy;
        };
        Sort sort = "asc".equalsIgnoreCase(direction)
                ? Sort.by(sortProperty).ascending()
                : Sort.by(sortProperty).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<LeadResponse> data = leadService.search(search, status, courseId, sourceId, consultantId, inQueue, hasOpenInvoice, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách Lead thành công"));
    }

    /**
     * GET /api/leads/consultants — Lấy danh sách tư vấn viên thực tế
     */
    @GetMapping("/consultants")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getConsultants() {
        List<ConsultantResponse> data = leadService.getConsultants();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách tư vấn viên thành công"));
    }

    /**
     * GET /api/leads/{id} — Lấy thông tin cơ bản Lead theo ID
     */
    @GetMapping("/{id:[0-9]+}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        LeadResponse data = leadService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy thông tin Lead thành công"));
    }

    /**
     * GET /api/leads/{id}/detail — Lấy thông tin chi tiết Lead kèm tương tác, test và lịch sử
     */
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getDetailById(@PathVariable Long id) {
        LeadDetailResponse data = leadService.getDetailById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chi tiết Lead thành công"));
    }

    /**
     * PUT /api/leads/{id} — Cập nhật thông tin Lead
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody LeadUpdateRequest request
    ) {
        LeadResponse data = leadService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật Lead thành công"));
    }

    /**
     * PUT /api/leads/{id}/assign — Phân công / chuyển người phụ trách Lead
     */
    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> assignConsultant(
            @PathVariable Long id,
            @Valid @RequestBody LeadAssignRequest request
    ) {
        LeadResponse data = leadService.assignConsultant(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Phân công tư vấn viên thành công"));
    }

    /**
     * POST /api/leads/{id}/interactions — Ghi nhận tương tác tư vấn
     */
    @PostMapping("/{id}/interactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> logInteraction(
            @PathVariable Long id,
            @Valid @RequestBody LeadInteractionCreateRequest request
    ) {
        LeadInteractionResponse data = leadService.logInteraction(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Ghi nhận tương tác tư vấn thành công"));
    }

    /**
     * GET /api/leads/{id}/interactions — Lấy lịch sử tương tác của Lead
     */
    @GetMapping("/{id}/interactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getInteractions(@PathVariable Long id) {
        List<LeadInteractionResponse> data = leadService.getInteractions(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy lịch sử tương tác thành công"));
    }

    /**
     * POST /api/leads/{id}/placement-tests — Xếp lịch hoặc ghi nhận kết quả đánh giá đầu vào
     */
    @PostMapping("/{id}/placement-tests")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> recordPlacementTest(
            @PathVariable Long id,
            @Valid @RequestBody LeadPlacementTestCreateRequest request
    ) {
        LeadPlacementTestResponse data = leadService.recordPlacementTest(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Ghi nhận đánh giá đầu vào thành công"));
    }

    /**
     * GET /api/leads/{id}/placement-tests — Lấy danh sách đánh giá đầu vào của Lead
     */
    @GetMapping("/{id}/placement-tests")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getPlacementTests(@PathVariable Long id) {
        List<LeadPlacementTestResponse> data = leadService.getPlacementTests(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách đánh giá đầu vào thành công"));
    }

    /**
     * DELETE /api/leads/{id} — Kết thúc / đóng tư vấn Lead
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RequestResponse> delete(@PathVariable Long id) {
        leadService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Đóng tư vấn Lead thành công"));
    }

    /**
     * POST /api/leads/{id}/claim — Tư vấn viên nhanh tay nhận Lead (Fast-Claim)
     */
    @PostMapping("/{id}/claim")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT')")
    public ResponseEntity<RequestResponse> claimLead(@PathVariable Long id) {
        Long consultantId = SecurityUtils.requireCurrentAccountId();
        LeadResponse data = leadService.claimLead(id, consultantId);
        return ResponseEntity.ok(new RequestResponse(data, "Tiếp nhận khách hàng thành công"));
    }

    /**
     * GET /api/leads/consultants/work-status — Lấy trạng thái ca trực hiện tại của TVV
     */
    @GetMapping("/consultants/work-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT')")
    public ResponseEntity<RequestResponse> getWorkStatus() {
        Long currentId = SecurityUtils.requireCurrentAccountId();
        String status = leadService.getConsultantWorkStatus(currentId);
        return ResponseEntity.ok(new RequestResponse(Map.of("workStatus", status), "Lấy trạng thái ca trực thành công"));
    }

    /**
     * PUT /api/leads/consultants/work-status — Cập nhật trạng thái ca trực của TVV
     */
    @PutMapping("/consultants/work-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT')")
    public ResponseEntity<RequestResponse> updateWorkStatus(@RequestBody Map<String, String> body) {
        Long currentId = SecurityUtils.requireCurrentAccountId();
        String status = body != null ? body.getOrDefault("workStatus", "AVAILABLE") : "AVAILABLE";
        leadService.updateConsultantWorkStatus(currentId, status);
        return ResponseEntity.ok(new RequestResponse(Map.of("workStatus", status), "Cập nhật trạng thái ca trực thành công"));
    }

    /**
     * GET /api/leads/consultants/performance — Thống kê hiệu suất tư vấn viên
     */
    @GetMapping("/consultants/performance")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT')")
    public ResponseEntity<RequestResponse> getPerformance() {
        var data = leadService.getConsultantPerformance();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy bảng hiệu suất tư vấn viên thành công"));
    }

    /**
     * GET /api/leads/statistics/summary — Thống kê tuyển sinh & hiệu suất tư vấn viên
     */
    @GetMapping("/statistics/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'LEAD', 'CONSULTANT')")
    public ResponseEntity<RequestResponse> getStatistics(
            @RequestParam(required = false) Long consultantId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDateTime start = parseDateTime(startDate, true);
        LocalDateTime end = parseDateTime(endDate, false);
        LeadStatisticsResponse data = leadService.getLeadStatistics(consultantId, start, end);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy thống kê tư vấn thành công"));
    }

    private LocalDateTime parseDateTime(String text, boolean isStart) {
        if (text == null || text.isBlank()) return null;
        try {
            if (text.endsWith("Z") || text.contains("+")) {
                return java.time.Instant.parse(text).atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
            }
            if (text.contains("T")) {
                return LocalDateTime.parse(text);
            }
            java.time.LocalDate d = java.time.LocalDate.parse(text);
            return isStart ? d.atStartOfDay() : d.atTime(java.time.LocalTime.MAX);
        } catch (Exception e) {
            return null;
        }
    }
}
