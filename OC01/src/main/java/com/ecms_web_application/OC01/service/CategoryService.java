package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.CategoryCreateRequest;
import com.ecms_web_application.OC01.dto.request.CategoryUpdateRequest;
import com.ecms_web_application.OC01.dto.response.CategoryResponse;
import com.ecms_web_application.OC01.dto.response.CategoryTreeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CategoryService {

    // ============ QUERY ============
    Page<CategoryResponse> search(String search, Boolean isActive, Long parentId, Pageable pageable);

    CategoryResponse getById(Long id);

    List<CategoryTreeResponse> getFullTree();

    List<CategoryTreeResponse> getTreeFromRoot(Long rootId);

    List<CategoryResponse> getRootCategories();

    List<CategoryResponse> getChildren(Long parentId);

    // ============ MUTATION ============
    CategoryResponse create(CategoryCreateRequest request);

    CategoryResponse update(Long id, CategoryUpdateRequest request);

    void delete(Long id);
}