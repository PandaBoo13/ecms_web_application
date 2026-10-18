package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.ChatMessage;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends IRepository<ChatMessage, Long> {

    @Query("""
        SELECT m FROM ChatMessage m
        WHERE m.conversationId = :convId AND m.isDeleted = false
        ORDER BY m.id DESC
    """)
    Page<ChatMessage> findByConversationDesc(@Param("convId") Long convId, Pageable pageable);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.isDeleted = true WHERE m.id = :id")
    void softDelete(@Param("id") Long id);

    @Modifying
    @Query("UPDATE ChatMessage m SET m.content = :content, m.isEdited = true WHERE m.id = :id")
    void updateContent(@Param("id") Long id, @Param("content") String content);
}