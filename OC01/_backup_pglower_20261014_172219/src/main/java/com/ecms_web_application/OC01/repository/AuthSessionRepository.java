package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.AuthSession;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuthSessionRepository extends IRepository<AuthSession, Long> {

    // ============================================================
    // Lookup cơ bản
    // ============================================================

    /**
     * Tìm session theo refresh token hash.
     * Dùng khi: refresh token, logout, revoke.
     */
    Optional<AuthSession> findByRefreshTokenHash(String refreshTokenHash);

    /**
     * Đếm số session đang active của 1 account.
     * Dùng khi: hiển thị "đang đăng nhập trên N thiết bị".
     */
    long countByAccount_IdAndRevokedAtIsNullAndExpiresAtAfter(
            Long accountId, LocalDateTime now);

    // ============================================================
    // Query cho AuthenticationService
    // ============================================================

    /**
     * Tìm tất cả session active của 1 account.
     * Dùng khi: revoke all sau khi đổi mật khẩu.
     */
    List<AuthSession> findByAccountIdAndRevokedAtIsNullAndExpiresAtAfter(
            Long accountId, LocalDateTime now);

    /**
     * Load session + account (tránh LazyInitializationException).
     * Dùng khi: refresh token cần truy cập account.getRole().
     */
    @Query("""
        SELECT s FROM AuthSession s
        JOIN FETCH s.account a
        LEFT JOIN FETCH a.role
        WHERE s.refreshTokenHash = :hash
    """)
    Optional<AuthSession> findByRefreshTokenHashWithAccount(@Param("hash") String hash);

    // ============================================================
    // Quản lý session (admin UI / user settings)
    // ============================================================

    /**
     * Lấy tất cả session của 1 account (kể cả đã revoke).
     */
    List<AuthSession> findByAccount_IdOrderByCreatedAtDesc(Long accountId);

    /**
     * Lấy chỉ session đang active.
     */
    @Query("""
        SELECT s FROM AuthSession s
        WHERE s.account.id = :accountId
          AND s.revokedAt IS NULL
          AND s.expiresAt > :now
        ORDER BY s.lastActiveAt DESC
    """)
    List<AuthSession> findActiveSessionsByAccount(
            @Param("accountId") Long accountId,
            @Param("now") LocalDateTime now);

    // ============================================================
    // Bulk operations
    // ============================================================

    /**
     * Revoke tất cả session active của 1 account.
     * Dùng khi: đổi mật khẩu, admin khóa tài khoản.
     */
    @Modifying
    @Query("""
        UPDATE AuthSession s
        SET s.revokedAt = :now,
            s.revokedReason = :reason
        WHERE s.account.id = :accountId
          AND s.revokedAt IS NULL
    """)
    int revokeAllByAccountId(
            @Param("accountId") Long accountId,
            @Param("now") LocalDateTime now,
            @Param("reason") String reason);

    /**
     * Xóa session hết hạn (cleanup định kỳ).
     */
    @Modifying
    @Query("DELETE FROM AuthSession s WHERE s.expiresAt < :now")
    int deleteExpiredSessions(@Param("now") LocalDateTime now);

    /**
     * Xóa session của 1 account (khi xóa account).
     */
    @Modifying
    @Query("DELETE FROM AuthSession s WHERE s.account.id = :accountId")
    void deleteAllByAccountId(@Param("accountId") Long accountId);

    // ============================================================
    // Check
    // ============================================================

    boolean existsByRefreshTokenHash(String refreshTokenHash);
}