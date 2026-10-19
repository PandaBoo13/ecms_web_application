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

    Optional<AuthSession> findByRefreshTokenHash(String refreshTokenHash);

    long countByAccount_IdAndRevokedAtIsNullAndExpiresAtAfter(
            Long accountId, LocalDateTime now);

    List<AuthSession> findByAccountIdAndRevokedAtIsNullAndExpiresAtAfter(
            Long accountId, LocalDateTime now);

    @Query("""
        SELECT s FROM AuthSession s
        JOIN FETCH s.account a
        LEFT JOIN FETCH a.role
        WHERE s.refreshTokenHash = :hash
    """)
    Optional<AuthSession> findByRefreshTokenHashWithAccount(@Param("hash") String hash);

    List<AuthSession> findByAccount_IdOrderByCreatedAtDesc(Long accountId);

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
            @Param("reason") String reason);      // ✅ giữ String — JPQL bind OK khi entity là String

    @Modifying
    @Query("DELETE FROM AuthSession s WHERE s.expiresAt < :now")
    int deleteExpiredSessions(@Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM AuthSession s WHERE s.account.id = :accountId")
    void deleteAllByAccountId(@Param("accountId") Long accountId);

    boolean existsByRefreshTokenHash(String refreshTokenHash);
}