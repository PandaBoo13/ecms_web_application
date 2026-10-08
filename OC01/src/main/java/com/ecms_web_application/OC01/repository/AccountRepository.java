package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.enums.AuthProvider;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends IRepository<Account, Long> {

    // ============================================================
    // Lookup cơ bản
    // ============================================================
    Optional<Account> findByEmail(String email);
    boolean existsByEmail(String email);

    // ⚠️ Đổi `String provider` → `AuthProvider provider` để type-safe
    Optional<Account> findByProviderAndProviderId(AuthProvider provider, String providerId);

    @Query("SELECT a FROM Account a " +
            "LEFT JOIN FETCH a.role " +
            "LEFT JOIN FETCH a.userProfile " +
            "WHERE a.email = :email")
    Optional<Account> findByEmailWithRole(@Param("email") String email);

    // ============================================================
    // RBAC
    // ============================================================

    // --- Tìm theo role ---
    List<Account> findByRoleId(Long roleId);
    List<Account> findByRoleCode(String roleCode);

    // --- Load chi tiết 1 account (kèm role + profile) ---
    @Query("SELECT a FROM Account a " +
            "LEFT JOIN FETCH a.role r " +
            "LEFT JOIN FETCH a.userProfile up " +
            "WHERE a.id = :id AND a.deletedAt IS NULL")
    Optional<Account> findByIdWithRoleAndProfile(@Param("id") Long id);

    // --- Phân trang theo roleId ---
    @Query(
            value = "SELECT a FROM Account a " +
                    "LEFT JOIN FETCH a.role r " +
                    "LEFT JOIN FETCH a.userProfile up " +
                    "WHERE a.deletedAt IS NULL AND r.id = :roleId " +
                    "ORDER BY a.createdAt DESC",
            countQuery = "SELECT COUNT(a) FROM Account a " +
                    "JOIN a.role r " +
                    "WHERE a.deletedAt IS NULL AND r.id = :roleId"
    )
    Page<Account> findByRoleIdPageable(@Param("roleId") Long roleId, Pageable pageable);

    // --- Pagination + filter cho admin ---
    @Query(
            value = "SELECT a FROM Account a " +
                    "LEFT JOIN FETCH a.role r " +
                    "LEFT JOIN FETCH a.userProfile up " +
                    "WHERE a.deletedAt IS NULL " +
                    "  AND (:roleCode IS NULL OR r.code = :roleCode) " +
                    "  AND (:isActive IS NULL OR a.isActive = :isActive) " +
                    "  AND (:search IS NULL " +
                    "       OR LOWER(a.email)       LIKE LOWER(CONCAT('%', :search, '%')) " +
                    "       OR LOWER(up.fullName)   LIKE LOWER(CONCAT('%', :search, '%')) " +
                    "       OR LOWER(up.phone)      LIKE LOWER(CONCAT('%', :search, '%'))) " +
                    "ORDER BY a.createdAt DESC",
            countQuery = "SELECT COUNT(a) FROM Account a " +
                    "LEFT JOIN a.role r " +
                    "LEFT JOIN a.userProfile up " +
                    "WHERE a.deletedAt IS NULL " +
                    "  AND (:roleCode IS NULL OR r.code = :roleCode) " +
                    "  AND (:isActive IS NULL OR a.isActive = :isActive) " +
                    "  AND (:search IS NULL " +
                    "       OR LOWER(a.email)       LIKE LOWER(CONCAT('%', :search, '%')) " +
                    "       OR LOWER(up.fullName)   LIKE LOWER(CONCAT('%', :search, '%')) " +
                    "       OR LOWER(up.phone)      LIKE LOWER(CONCAT('%', :search, '%')))"
    )
    Page<Account> searchAccounts(
            @Param("roleCode") String roleCode,
            @Param("isActive") Boolean isActive,
            @Param("search") String search,
            Pageable pageable
    );
}