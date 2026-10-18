package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.ChatParticipant;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ChatParticipantRepository extends IRepository<ChatParticipant, Long> {

    // ==================== LOOKUP ====================

    Optional<ChatParticipant> findByConversationIdAndAccountIdAndLeftAtIsNull(Long convId, Long accountId);

    Optional<ChatParticipant> findByConversationIdAndAccountId(Long convId, Long accountId);

    boolean existsByConversationIdAndAccountIdAndLeftAtIsNull(Long convId, Long accountId);

    List<ChatParticipant> findByConversationIdAndLeftAtIsNull(Long convId);

    List<ChatParticipant> findByConversationIdInAndLeftAtIsNull(Collection<Long> conversationIds);

    /** Tìm participant còn lại trong conversation (dùng cho PRIVATE chat). */
    Optional<ChatParticipant> findFirstByConversationIdAndAccountIdNotAndLeftAtIsNull(
            Long conversationId, Long accountId);

    long countByConversationIdAndLeftAtIsNull(Long convId);

    // ==================== BATCH UPDATE ====================

    @Modifying
    @Query("""
        UPDATE ChatParticipant p
        SET p.unreadCount = p.unreadCount + 1,
            p.lastMessagePreview = :preview,
            p.updatedAt = CURRENT_TIMESTAMP
        WHERE p.conversationId = :convId
          AND p.accountId <> :senderId
          AND p.leftAt IS NULL
    """)
    void incrementUnreadForOthers(@Param("convId") Long convId,
                                  @Param("senderId") Long senderId,
                                  @Param("preview") String preview);

    @Modifying
    @Query("""
        UPDATE ChatParticipant p
        SET p.unreadCount = 0,
            p.lastReadMessageId = :msgId,
            p.updatedAt = CURRENT_TIMESTAMP
        WHERE p.conversationId = :convId AND p.accountId = :accountId
    """)
    void markAsRead(@Param("convId") Long convId,
                    @Param("accountId") Long accountId,
                    @Param("msgId") Long msgId);

    @Modifying
    @Query("UPDATE ChatParticipant p SET p.leftAt = CURRENT_TIMESTAMP WHERE p.id = :id")
    void markAsLeft(@Param("id") Long id);

    @Modifying
    @Query("""
        UPDATE ChatParticipant p
        SET p.lastMessagePreview = :preview,
            p.updatedAt = CURRENT_TIMESTAMP
        WHERE p.conversationId = :convId AND p.accountId = :accountId
    """)
    void updateSenderPreview(@Param("convId") Long convId,
                             @Param("accountId") Long accountId,
                             @Param("preview") String preview);
}