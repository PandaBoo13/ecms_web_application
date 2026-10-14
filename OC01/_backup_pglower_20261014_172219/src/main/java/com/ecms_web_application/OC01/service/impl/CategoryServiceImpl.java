package com.ecms_web_application.OC01.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ecms_web_application.OC01.dto.request.CategoryCreateRequest;
import com.ecms_web_application.OC01.dto.request.CategoryUpdateRequest;
import com.ecms_web_application.OC01.dto.response.CategoryResponse;
import com.ecms_web_application.OC01.dto.response.CategoryTreeResponse;
import com.ecms_web_application.OC01.entity.Category;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.CategoryRepository;
import com.ecms_web_application.OC01.repository.InstructorSpecializationRepository;
import com.ecms_web_application.OC01.service.CategoryService;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final InstructorSpecializationRepository specializationRepository;

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");

    // ============================================================
    // QUERY
    // ============================================================

    @Override
    @Transactional(readOnly = true)
    public Page<CategoryResponse> search(String search, Boolean isActive, Long parentId, Pageable pageable) {
        return categoryRepository
                .searchCategories(isActive, parentId, emptyToNull(search), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getById(Long id) {
        Category c = categoryRepository.findByIdWithParent(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Category không tồn tại"));
        return toResponse(c);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryTreeResponse> getFullTree() {
        List<Category> all = categoryRepository.findByIsActiveTrue();
        return buildForest(all);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryTreeResponse> getTreeFromRoot(Long rootId) {
        Category root = categoryRepository.findById(rootId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Category không tồn tại"));

        // Load toàn bộ descendant bằng recursive CTE
        List<Long> descendantIds = categoryRepository.findDescendantsNative(rootId)
                .stream()
                .map(row -> ((Number) row[0]).longValue())
                .toList();

        if (descendantIds.isEmpty()) return List.of(toTree(root));

        List<Category> all = categoryRepository.findAllById(descendantIds);
        CategoryTreeResponse rootTree = toTree(root);
        attachChildren(rootTree, all);
        return List.of(rootTree);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getRootCategories() {
        return categoryRepository.findByParentIsNullAndIsActiveTrue()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getChildren(Long parentId) {
        if (!categoryRepository.existsById(parentId)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Category cha không tồn tại");
        }
        return categoryRepository.findByParentId(parentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ============================================================
    // CREATE
    // ============================================================

    @Override
    @Transactional
    public CategoryResponse create(CategoryCreateRequest request) {
        // 1. Sinh slug nếu chưa có
        String slug = (request.getSlug() != null && !request.getSlug().isBlank())
                ? slugify(request.getSlug())
                : slugify(request.getName());

        if (categoryRepository.existsBySlug(slug)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Slug đã tồn tại: " + slug);
        }

        // 2. Validate parent nếu có
        Category parent = null;
        if (request.getParentId() != null) {
            parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Category cha không tồn tại"));
        }

        // 3. Tạo mới
        Category c = new Category();
        c.setName(request.getName().trim());
        c.setSlug(slug);
        c.setDescription(request.getDescription());
        c.setParent(parent);
        c.setIsActive(true);

        Category saved = categoryRepository.save(c);
        log.info("Tạo category mới: id={}, slug={}", saved.getId(), saved.getSlug());
        return toResponse(saved);
    }

    // ============================================================
    // UPDATE
    // ============================================================

    @Override
    @Transactional
    public CategoryResponse update(Long id, CategoryUpdateRequest request) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Category không tồn tại"));

        // 1. Đổi slug (nếu có)
        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            String newSlug = slugify(request.getSlug());
            if (!newSlug.equals(c.getSlug())) {
                if (categoryRepository.existsBySlugAndIdNot(newSlug, id)) {
                    throw new ErrorHandler(HttpStatus.CONFLICT, "Slug đã tồn tại: " + newSlug);
                }
                c.setSlug(newSlug);
            }
        }

        // 2. Đổi name
        if (request.getName() != null && !request.getName().isBlank()) {
            c.setName(request.getName().trim());
        }

        // 3. Đổi description
        if (request.getDescription() != null) {
            c.setDescription(request.getDescription().trim().isEmpty()
                    ? null : request.getDescription().trim());
        }

        // 4. Đổi parent — QUAN TRỌNG: check cycle
        if (request.getParentId() != null) {
            Long newParentId = request.getParentId();

            // 4a. Không được tự làm cha của chính mình
            if (Objects.equals(newParentId, id)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Không thể đặt chính category làm cha của nó");
            }

            // 4b. Không được đặt parent là descendant của chính nó (tránh cycle)
            if (categoryRepository.isAncestorOf(id, newParentId)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                        "Không thể đặt category con làm cha (gây vòng lặp)");
            }

            Category newParent = categoryRepository.findById(newParentId)
                    .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Category cha không tồn tại"));
            c.setParent(newParent);
        }

        // 5. Đổi isActive
        if (request.getIsActive() != null) {
            c.setIsActive(request.getIsActive());
        }

        Category saved = categoryRepository.save(c);
        log.info("Cập nhật category id={}", id);
        return toResponse(saved);
    }

    // ============================================================
    // DELETE
    // ============================================================

    @Override
    @Transactional
    public void delete(Long id) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Category không tồn tại"));

        // 1. Không xóa nếu còn con
        if (categoryRepository.hasChildren(id)) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Không thể xóa — category còn danh mục con");
        }

        // 2. Không xóa nếu đang được GV dùng làm chuyên môn
        if (specializationRepository.countByCategory_Id(id) > 0) {
            throw new ErrorHandler(HttpStatus.CONFLICT,
                    "Không thể xóa — category đang được giảng viên sử dụng");
        }

        categoryRepository.delete(c);
        log.info("Xóa category id={}, slug={}", id, c.getSlug());
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private CategoryResponse toResponse(Category c) {
        CategoryResponse res = new CategoryResponse();
        res.setId(c.getId());
        res.setName(c.getName());
        res.setSlug(c.getSlug());
        res.setDescription(c.getDescription());
        res.setIsActive(c.getIsActive());
        res.setCreatedAt(c.getCreatedAt());
        res.setUpdatedAt(c.getUpdatedAt());
        if (c.getParent() != null) {
            res.setParentId(c.getParent().getId());
            res.setParentName(c.getParent().getName());
        }
        res.setChildCount(categoryRepository.countByParentId(c.getId()));
        return res;
    }

    private CategoryTreeResponse toTree(Category c) {
        CategoryTreeResponse t = new CategoryTreeResponse();
        t.setId(c.getId());
        t.setName(c.getName());
        t.setSlug(c.getSlug());
        t.setIsActive(c.getIsActive());
        return t;
    }

    private List<CategoryTreeResponse> buildForest(List<Category> all) {
        Map<Long, CategoryTreeResponse> map = new HashMap<>();
        for (Category c : all) {
            map.put(c.getId(), toTree(c));
        }

        List<CategoryTreeResponse> roots = new ArrayList<>();
        for (Category c : all) {
            CategoryTreeResponse node = map.get(c.getId());
            if (c.getParent() == null) {
                roots.add(node);
            } else {
                CategoryTreeResponse parentNode = map.get(c.getParent().getId());
                if (parentNode != null) {
                    parentNode.getChildren().add(node);
                } else {
                    // parent bị inactive → coi như root
                    roots.add(node);
                }
            }
        }
        return roots;
    }

    private void attachChildren(CategoryTreeResponse root, List<Category> all) {
        Map<Long, CategoryTreeResponse> map = new HashMap<>();
        for (Category c : all) {
            map.put(c.getId(), toTree(c));
        }
        // Gắn chính root vào map để dễ tìm
        map.put(root.getId(), root);

        for (Category c : all) {
            if (c.getParent() == null) continue;
            CategoryTreeResponse parent = map.get(c.getParent().getId());
            CategoryTreeResponse child = map.get(c.getId());
            if (parent != null && child != null && !parent.getChildren().contains(child)) {
                parent.getChildren().add(child);
            }
        }
    }

    /**
     * Sinh slug từ tiếng Việt:
     * "Lập trình Python" → "lap-trinh-python"
     */
    private String slugify(String input) {
        if (input == null) return "";
        String temp = Normalizer.normalize(input, Normalizer.Form.NFD);
        temp = temp.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        temp = temp.replaceAll("đ", "d").replaceAll("Đ", "D");
        temp = temp.toLowerCase(Locale.ROOT);
        temp = NON_ALNUM.matcher(temp).replaceAll("-");
        temp = temp.replaceAll("^-+|-+$", "");
        return temp;
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}