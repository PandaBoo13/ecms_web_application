package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.ChatConversation;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ChatConversationRepository extends IRepository<ChatConversation, Long> {

    Optional<ChatConversation> findByPrivateChatKey(String key);

    java.util.List<ChatConversation> findByPrivateChatKeyIn(java.util.Collection<String> keys);

    @Query("""
        SELECT DISTINCT c FROM ChatConversation c
        JOIN ChatParticipant p ON p.conversationId = c.id
        WHERE p.accountId = :accountId
          AND p.leftAt IS NULL
          AND p.isArchived = false
        ORDER BY c.lastMessageAt DESC NULLS LAST
    """)
    Page<ChatConversation> findMyConversations(@Param("accountId") Long accountId, Pageable pageable);
}