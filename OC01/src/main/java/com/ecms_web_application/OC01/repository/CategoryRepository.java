package com.ecms_web_application.OC01.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.ecms_web_application.OC01.entity.Category;
import com.ecms_web_application.OC01.generic.IRepository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends IRepository<Category, Long> {

    // ============================================================
    // Lookup cơ bản — JPQL, chạy cả MySQL lẫn PostgreSQL
    // ============================================================
    Optional<Category> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);

    List<Category> findByParentIsNull();
    List<Category> findByParentId(Long parentId);

    List<Category> findByIsActiveTrue();
    List<Category> findByParentIsNullAndIsActiveTrue();

    long countByParentId(Long parentId);

    // ============================================================
    // Pagination + filter — JPQL
    // ✅ PostgreSQL hỗ trợ NULLS FIRST native trong JPQL
    // ============================================================
    @Query("""
        SELECT c FROM Category c
        LEFT JOIN FETCH c.parent p
        WHERE (:isActive IS NULL OR c.isActive = :isActive)
          AND (:parentId IS NULL OR c.parent.id = :parentId)
          AND (:search IS NULL
               OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(c.slug) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY c.parent.id ASC NULLS FIRST, c.name ASC
    """)
    Page<Category> searchCategories(
            @Param("isActive") Boolean isActive,
            @Param("parentId") Long parentId,
            @Param("search") String search,
            Pageable pageable
    );

    // ============================================================
    // Load chi tiết — JPQL
    // ============================================================
    @Query("""
        SELECT c FROM Category c
        LEFT JOIN FETCH c.parent p
        WHERE c.id = :id
    """)
    Optional<Category> findByIdWithParent(@Param("id") Long id);

    // ============================================================
    // 🎯 Recursive CTE — Lấy TỔ TIÊN của 1 category (đi lên gốc)
    // PostgreSQL syntax (giống MySQL 8.0+)
    // ============================================================
    @Query(value = """
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id
            FROM category
            WHERE id = :categoryId

            UNION ALL

            SELECT c.id, c.parent_id
            FROM category c
            INNER JOIN ancestors a ON c.id = a.parent_id
        )
        SELECT id FROM ancestors
    """, nativeQuery = true)
    List<Long> findAncestorIdsNative(@Param("categoryId") Long categoryId);

    // ============================================================
    // 🎯 Recursive CTE — Lấy CÂY CON của 1 category (đi xuống lá)
    // ============================================================
    @Query(value = """
        WITH RECURSIVE descendants AS (
            SELECT id, parent_id, name, slug, 1 AS depth
            FROM category
            WHERE id = :categoryId

            UNION ALL

            SELECT c.id, c.parent_id, c.name, c.slug, d.depth + 1
            FROM category c
            INNER JOIN descendants d ON c.parent_id = d.id
        )
        SELECT id, parent_id, name, slug, depth
        FROM descendants
        ORDER BY depth, name
    """, nativeQuery = true)
    List<Object[]> findDescendantsNative(@Param("categoryId") Long categoryId);

    // ============================================================
    // Check ancestor relationship — PostgreSQL boolean native
    // ============================================================
    @Query(value = """
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id FROM category WHERE id = :childId
            UNION ALL
            SELECT c.id, c.parent_id FROM category c
            INNER JOIN ancestors a ON c.id = a.parent_id
        )
        SELECT COUNT(*) > 0 FROM ancestors WHERE id = :ancestorId
    """, nativeQuery = true)
    boolean isAncestorOf(
            @Param("ancestorId") Long ancestorId,
            @Param("childId") Long childId
    );

    // ============================================================
    // Check có con không (trước khi xóa)
    // ============================================================
    @Query("SELECT COUNT(c) > 0 FROM Category c WHERE c.parent.id = :categoryId")
    boolean hasChildren(@Param("categoryId") Long categoryId);
}