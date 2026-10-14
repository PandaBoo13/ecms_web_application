package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.AccountPermission;
import com.ecms_web_application.OC01.entity.AccountPermissionId;
import com.ecms_web_application.OC01.entity.Permission;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountPermissionRepository
        extends IRepository<AccountPermission, AccountPermissionId> {

    // ============================================================
    // Lookup cơ bản
    // Lưu ý: dùng `Account_Id` (underscore) để Spring Data hiểu là
    //        "property account → property id", không phải "property accountId".
    // ============================================================

    List<AccountPermission> findByAccount_Id(Long accountId);

    List<AccountPermission> findByAccount_IdAndIsEnabled(Long accountId, Boolean isEnabled);

    Optional<AccountPermission> findByAccount_IdAndPermission_Id(Long accountId, Long permissionId);

    boolean existsByAccount_IdAndPermission_Id(Long accountId, Long permissionId);

    boolean existsByAccount_IdAndPermission_IdAndIsEnabledTrue(Long accountId, Long permissionId);

    // Đếm số quyền đang enabled của 1 account
    long countByAccount_IdAndIsEnabledTrue(Long accountId);

    // ============================================================
    // Xóa — JPQL với ap.account.id / ap.permission.id
    // ============================================================
    @Modifying
    @Query("DELETE FROM AccountPermission ap " +
            "WHERE ap.account.id = :accountId AND ap.permission.id = :permissionId")
    void deleteOne(@Param("accountId") Long accountId,
                   @Param("permissionId") Long permissionId);

    @Modifying
    @Query("DELETE FROM AccountPermission ap WHERE ap.account.id = :accountId")
    void deleteAllByAccountId(@Param("accountId") Long accountId);

    @Modifying
    @Query("DELETE FROM AccountPermission ap WHERE ap.permission.id = :permissionId")
    void deleteAllByPermissionId(@Param("permissionId") Long permissionId);

    // ============================================================
    // Query JOIN với Permission — dùng JOIN FETCH
    // ============================================================

    /**
     * Lấy tất cả AccountPermission của 1 account, kèm Permission đã load sẵn.
     */
    @Query("""
        SELECT ap
        FROM AccountPermission ap
        JOIN FETCH ap.permission p
        WHERE ap.account.id = :accountId
        ORDER BY p.module ASC, p.endpointPattern ASC
    """)
    List<AccountPermission> findWithPermissionDetailByAccountId(@Param("accountId") Long accountId);

    /**
     * Chỉ lấy bản ghi is_enabled = true (effective permissions).
     */
    @Query("""
        SELECT ap
        FROM AccountPermission ap
        JOIN FETCH ap.permission p
        WHERE ap.account.id = :accountId
          AND ap.isEnabled = true
        ORDER BY p.module ASC, p.endpointPattern ASC
    """)
    List<AccountPermission> findEnabledWithPermissionDetailByAccountId(@Param("accountId") Long accountId);

    // ============================================================
    // Check permission theo method + endpoint trong 1 query
    // ============================================================
    @Query("""
        SELECT COUNT(ap) > 0
        FROM AccountPermission ap
        JOIN ap.permission p
        WHERE ap.account.id = :accountId
          AND ap.isEnabled = true
          AND p.method = :method
          AND p.endpointPattern = :endpoint
    """)
    boolean hasPermission(@Param("accountId") Long accountId,
                          @Param("method") String method,
                          @Param("endpoint") String endpoint);

    // ============================================================
    // Lấy tất cả permission đang enabled của account
    // ============================================================
    @Query("""
        SELECT p
        FROM AccountPermission ap
        JOIN ap.permission p
        WHERE ap.account.id = :accountId
          AND ap.isEnabled = true
        ORDER BY p.module ASC, p.endpointPattern ASC
    """)
    List<Permission> findEnabledPermissionsByAccountId(@Param("accountId") Long accountId);
}