package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.CategoryCreateRequest;
import com.ecms_web_application.OC01.dto.request.CategoryUpdateRequest;
import com.ecms_web_application.OC01.dto.response.CategoryResponse;
import com.ecms_web_application.OC01.dto.response.CategoryTreeResponse;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Category API — /api/categories
 *
 * Read (PUBLIC):
 *  - GET    /                       → search (paging + filter)
 *  - GET    /{id}                   → chi tiết
 *  - GET    /tree                   → cây đầy đủ
 *  - GET    /tree/{rootId}          → cây con từ root
 *  - GET    /roots                  → danh mục gốc
 *  - GET    /{parentId}/children    → danh mục con trực tiếp
 *
 * Write (PROTECTED — cần permission):
 *  - POST   /                       → tạo mới
 *  - PUT    /{id}                   → cập nhật
 *  - DELETE /{id}                   → xóa
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Slf4j
public class CategoryController {

    private final CategoryService categoryService;

    // ============================================================
    // READ
    // ============================================================

    /** GET /api/categories — phân trang + filter */
    @GetMapping
    public ResponseEntity<RequestResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Long parentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = "desc".equalsIgnoreCase(sortDir)
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CategoryResponse> data = categoryService.search(search, isActive, parentId, pageable);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy danh sách category thành công"));
    }

    /** GET /api/categories/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> getById(@PathVariable Long id) {
        CategoryResponse data = categoryService.getById(id);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy category thành công"));
    }

    /** GET /api/categories/tree — cây đầy đủ */
    @GetMapping("/tree")
    public ResponseEntity<RequestResponse> getFullTree() {
        List<CategoryTreeResponse> data = categoryService.getFullTree();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy cây category thành công"));
    }

    /** GET /api/categories/tree/{rootId} — cây con từ root */
    @GetMapping("/tree/{rootId}")
    public ResponseEntity<RequestResponse> getTreeFromRoot(@PathVariable Long rootId) {
        List<CategoryTreeResponse> data = categoryService.getTreeFromRoot(rootId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy cây category thành công"));
    }

    /** GET /api/categories/roots */
    @GetMapping("/roots")
    public ResponseEntity<RequestResponse> getRootCategories() {
        List<CategoryResponse> data = categoryService.getRootCategories();
        return ResponseEntity.ok(new RequestResponse(data, "Lấy root category thành công"));
    }

    /** GET /api/categories/{parentId}/children */
    @GetMapping("/{parentId}/children")
    public ResponseEntity<RequestResponse> getChildren(@PathVariable Long parentId) {
        List<CategoryResponse> data = categoryService.getChildren(parentId);
        return ResponseEntity.ok(new RequestResponse(data, "Lấy category con thành công"));
    }

    // ============================================================
    // WRITE
    // ============================================================

    /** POST /api/categories */
    @PostMapping
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody CategoryCreateRequest request) {
        CategoryResponse data = categoryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo category thành công"));
    }

    /** PUT /api/categories/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<RequestResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CategoryUpdateRequest request) {
        CategoryResponse data = categoryService.update(id, request);
        return ResponseEntity.ok(new RequestResponse(data, "Cập nhật category thành công"));
    }

    /** DELETE /api/categories/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.ok(new RequestResponse("Xóa category thành công"));
    }
}