package com.ecms_web_application.OC01.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.InstructorSpecialization;
import com.ecms_web_application.OC01.entity.InstructorSpecializationId;
import com.ecms_web_application.OC01.generic.IRepository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InstructorSpecializationRepository
        extends IRepository<InstructorSpecialization, InstructorSpecializationId> {

    // ============================================================
    // Lookup cơ bản — JPQL
    // ============================================================
    List<InstructorSpecialization> findByAccount_Id(Long accountId);
    List<InstructorSpecialization> findByCategory_Id(Long categoryId);

    Optional<InstructorSpecialization> findByAccount_IdAndCategory_Id(Long accountId, Long categoryId);
    boolean existsByAccount_IdAndCategory_Id(Long accountId, Long categoryId);

    Optional<InstructorSpecialization> findByAccount_IdAndIsPrimaryTrue(Long accountId);

    long countByAccount_Id(Long accountId);
    long countByCategory_Id(Long categoryId);

    // ============================================================
    // Load kèm Category/Account — JPQL với JOIN FETCH
    // ============================================================
    @Query("""
        SELECT s FROM InstructorSpecialization s
        JOIN FETCH s.category c
        WHERE s.account.id = :accountId
        ORDER BY s.isPrimary DESC, c.name ASC
    """)
    List<InstructorSpecialization> findWithCategoryByAccountId(@Param("accountId") Long accountId);

    @Query("""
        SELECT s FROM InstructorSpecialization s
        JOIN FETCH s.account a
        LEFT JOIN FETCH a.userProfile
        WHERE s.category.id = :categoryId
        ORDER BY s.isPrimary DESC
    """)
    List<InstructorSpecialization> findWithAccountByCategoryId(@Param("categoryId") Long categoryId);

    // ============================================================
    // 🎯 QUERY CHÍNH: Tìm GV dạy được course
    // Course gán category cấp con, GV gán category cấp cha
    // Recursive CTE — PostgreSQL syntax
    // ⚠️ Boolean trong PostgreSQL native: dùng `true` không dùng `1`
    // ⚠️ Native query trả về entity Account → phải SELECT a.*
    // ============================================================
    @Query(value = """
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id
            FROM category
            WHERE id = :courseCategoryId

            UNION ALL

            SELECT c.id, c.parent_id
            FROM category c
            INNER JOIN ancestors a ON c.id = a.parent_id
        )
        SELECT DISTINCT a.*
        FROM account a
        INNER JOIN instructor_specialization s ON s.account_id = a.id
        WHERE s.category_id IN (SELECT id FROM ancestors)
          AND a.deleted_at IS NULL
          AND a.is_active = true
        ORDER BY a.id
    """, nativeQuery = true)
    List<Account> findInstructorsByCourseCategory(@Param("courseCategoryId") Long courseCategoryId);

    // ============================================================
    // Variant: chỉ lấy GV có chuyên môn CHÍNH match
    // ============================================================
    @Query(value = """
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id FROM category WHERE id = :courseCategoryId
            UNION ALL
            SELECT c.id, c.parent_id FROM category c
            INNER JOIN ancestors a ON c.id = a.parent_id
        )
        SELECT DISTINCT a.*
        FROM account a
        INNER JOIN instructor_specialization s ON s.account_id = a.id
        WHERE s.category_id IN (SELECT id FROM ancestors)
          AND s.is_primary = true
          AND a.deleted_at IS NULL
          AND a.is_active = true
        ORDER BY a.id
    """, nativeQuery = true)
    List<Account> findPrimaryInstructorsByCourseCategory(@Param("courseCategoryId") Long courseCategoryId);

    // ============================================================
    // Xóa — JPQL với @Modifying
    // ============================================================
    @Modifying
    @Query("DELETE FROM InstructorSpecialization s WHERE s.account.id = :accountId")
    void deleteAllByAccountId(@Param("accountId") Long accountId);

    @Modifying
    @Query("""
        DELETE FROM InstructorSpecialization s
        WHERE s.account.id = :accountId AND s.category.id = :categoryId
    """)
    void deleteOne(@Param("accountId") Long accountId, @Param("categoryId") Long categoryId);

    // ============================================================
    // Reset cờ is_primary trước khi set chuyên môn chính mới
    // ============================================================
    @Modifying
    @Query("""
        UPDATE InstructorSpecialization s
        SET s.isPrimary = false
        WHERE s.account.id = :accountId AND s.isPrimary = true
    """)
    void resetPrimaryFlag(@Param("accountId") Long accountId);
}