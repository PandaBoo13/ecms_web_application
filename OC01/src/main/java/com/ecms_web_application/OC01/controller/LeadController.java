package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.LeadAssignRequest;
import com.ecms_web_application.OC01.dto.request.LeadCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadInteractionCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadPlacementTestCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadUpdateRequest;
import com.ecms_web_application.OC01.dto.response.LeadDetailResponse;
import com.ecms_web_application.OC01.dto.response.LeadInteractionResponse;
import com.ecms_web_application.OC01.dto.response.LeadPlacementTestResponse;
import com.ecms_web_application.OC01.dto.response.LeadResponse;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.LeadService;
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
@RequestMapping("/api/leads")
@RequiredArgsConstructor
@Slf4j
public class LeadController {

    private final LeadService leadService;

    /**
     * POST /api/leads — Tạo mới Lead
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody LeadCreateRequest request) {
        LeadResponse data = leadService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo Lead thành công"));
    }

    /**
     * GET /api/leads — Lấy danh sách Lead (phân trang + lọc theo status, courseId, sourceId, consultant, inQueue, tìm kiếm)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long sourceId,
            @RequestParam(required = false) Long consultantId,
            @RequestParam(required = false) Boolean inQueue,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = "asc".equalsIgnoreCase(direction)
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<LeadResponse> data = leadService.search(search, status, courseId, sourceId, consultantId, inQueue, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách Lead thành công"));
    }

    /**
     * GET /api/leads/{id} — Lấy thông tin cơ bản Lead theo ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        LeadResponse data = leadService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy thông tin Lead thành công"));
    }

    /**
     * GET /api/leads/{id}/detail — Lấy thông tin chi tiết Lead kèm tương tác, test và lịch sử
     */
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getDetailById(@PathVariable Long id) {
        LeadDetailResponse data = leadService.getDetailById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy chi tiết Lead thành công"));
    }

    /**
     * PUT /api/leads/{id} — Cập nhật thông tin Lead
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<RequestResponse> getInteractions(@PathVariable Long id) {
        List<LeadInteractionResponse> data = leadService.getInteractions(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy lịch sử tương tác thành công"));
    }

    /**
     * POST /api/leads/{id}/placement-tests — Xếp lịch hoặc ghi nhận kết quả đánh giá đầu vào
     */
    @PostMapping("/{id}/placement-tests")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
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
}
